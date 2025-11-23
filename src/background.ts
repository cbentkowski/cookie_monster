const tabUrlMap: { [tabId: number]: string } = {};
const tabCookiesMap: { [tabId: number]: Set<string> } = {}; // Stores "name|domain|storeId" strings

// Track tab URLs as they are updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url) {
        const oldUrl = tabUrlMap[tabId];
        const newUrl = tab.url;

        // If the URL has changed, check if we need to clean up the previous session
        if (oldUrl && oldUrl !== newUrl) {
            cleanupTabSession(tabId, oldUrl);
        }

        // console.log(`Tab updated: ${tabId} -> ${tab.url}`); // Reduced noise
        tabUrlMap[tabId] = tab.url;

        // Check if this is a tracked website and log it
        chrome.storage.local.get("websiteList", (data) => {
            const websites = data.websiteList || [];
            const matchedWebsite = websites.find((website: string) => tab.url && tab.url.includes(website));
            if (matchedWebsite) {
                console.log(`COOKIE MONSTER: Tracked site opened: ${matchedWebsite} (Tab ID: ${tabId})`);
            }
        });
    }
});

// Track cookies set by network requests
chrome.webRequest.onResponseStarted.addListener(
    (details) => {
        if (details.tabId === -1) return;

        const responseHeaders = details.responseHeaders;
        if (responseHeaders) {
            responseHeaders.forEach((header) => {
                if (header.name.toLowerCase() === 'set-cookie' && header.value) {
                    const cookieParts = header.value.split(';');
                    const namePart = cookieParts[0];
                    const name = namePart.split('=')[0].trim();

                    let domain = '';
                    // Try to find domain attribute
                    const domainPart = cookieParts.find(part => part.trim().toLowerCase().startsWith('domain='));
                    if (domainPart) {
                        domain = domainPart.split('=')[1].trim();
                    } else {
                        try {
                            domain = new URL(details.url).hostname;
                        } catch (e) {
                            console.error('COOKIE MONSTER: Error parsing URL for cookie domain:', details.url);
                        }
                    }

                    // Normalize domain (remove leading dot)
                    if (domain.startsWith('.')) {
                        domain = domain.substring(1);
                    }

                    if (!tabCookiesMap[details.tabId]) {
                        tabCookiesMap[details.tabId] = new Set();
                    }

                    // Store name, domain, and storeId (we don't have storeId from webRequest easily, 
                    // but we can try to infer or just store name/domain and delete from all stores later if needed.
                    // Actually, let's just store name and domain.
                    tabCookiesMap[details.tabId].add(JSON.stringify({ name, domain }));
                    // console.log(`Tracked cookie: ${name} for domain: ${domain} on tab: ${details.tabId}`); // Reduced noise
                }
            });
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);


// Clean up when a tab is removed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    const url = tabUrlMap[tabId];
    if (url) {
        cleanupTabSession(tabId, url);
    }

    // Cleanup maps
    delete tabUrlMap[tabId];
    delete tabCookiesMap[tabId];
    // console.log(`Tab removed: ${tabId}, cleaned up tracking data.`); // Reduced noise
});

/**
 * Checks if the given URL matches a tracked website and clears cookies/data if it does.
 * @param tabId The ID of the tab where the session occurred.
 * @param url The URL of the session to potentially clean up.
 */
function cleanupTabSession(tabId: number, url: string) {
    const trackedCookies = tabCookiesMap[tabId];

    chrome.storage.local.get("websiteList", (data) => {
        const websites = data.websiteList || [];
        const matchedWebsite = websites.find((website: string) => url.includes(website));

        if (matchedWebsite) {
            console.log(`COOKIE MONSTER: Session ended for tracked site: ${matchedWebsite} (Tab: ${tabId})`);

            // 1. Delete tracked 3rd party cookies
            if (trackedCookies && trackedCookies.size > 0) {
                console.log(`COOKIE MONSTER: Found ${trackedCookies.size} tracked cookies to delete.`);
                const cookieList: string[] = [];

                trackedCookies.forEach((cookieJson) => {
                    try {
                        const cookie = JSON.parse(cookieJson);
                        cookieList.push(`${cookie.name} (${cookie.domain})`);

                        // Fix: Ensure we don't use leading dot in URL
                        const cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;

                        const protocols = ['http://', 'https://'];
                        const domains = [cleanDomain, `.${cleanDomain}`];

                        protocols.forEach(protocol => {
                            const cookieUrl = `${protocol}${cleanDomain}`;
                            chrome.cookies.remove({
                                url: cookieUrl,
                                name: cookie.name
                            }, (details) => {
                                if (chrome.runtime.lastError) {
                                    console.warn(`COOKIE MONSTER: Failed to remove tracked cookie ${cookie.name} from ${cookieUrl}:`, chrome.runtime.lastError.message);
                                }
                            });
                        });

                    } catch (e) {
                        console.error("COOKIE MONSTER: Error parsing tracked cookie", e);
                    }
                });
                console.log(`COOKIE MONSTER: Deleting tracked cookies:\n${cookieList.join('\n')}`);
            } else {
                console.log("COOKIE MONSTER: No tracked cookies found for this session.");
            }

            // 2. Delete first-party cookies (fallback/cleanup)
            const matchedWebsiteUrl = matchedWebsite.startsWith('http')
                ? matchedWebsite
                : `https://${matchedWebsite}`;
            let domain = '';
            try {
                domain = new URL(matchedWebsiteUrl).hostname;
            } catch (e) {
                console.error("COOKIE MONSTER: Invalid matched website URL", matchedWebsiteUrl);
            }

            if (domain) {
                chrome.cookies.getAll({ domain }, (cookies) => {
                    if (cookies.length > 0) {
                        console.log(`COOKIE MONSTER: Found ${cookies.length} first-party cookies for domain ${domain}. Deleting...`);
                        cookies.forEach(cookie => {
                            const protocol = cookie.secure ? 'https://' : 'http://';
                            const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
                            const cookieUrl = `${protocol}${cookieDomain}${cookie.path}`;

                            chrome.cookies.remove({
                                url: cookieUrl,
                                name: cookie.name,
                                storeId: cookie.storeId
                            }, (details) => {
                                if (chrome.runtime.lastError) {
                                    console.warn(`COOKIE MONSTER: Failed to remove 1st party cookie ${cookie.name}:`, chrome.runtime.lastError.message);
                                }
                            });
                        });
                    } else {
                        console.log(`COOKIE MONSTER: No first-party cookies found for domain ${domain}.`);
                    }
                });

                // 3. Clear Storage
                console.log(`COOKIE MONSTER: Clearing browsing data for origin: ${domain}`);
                const removalOptions: chrome.browsingData.RemovalOptions = {
                    "origins": [new URL(url).origin] as [string, ...string[]]
                };

                chrome.browsingData.remove(
                    removalOptions,
                    {
                        "cache": true,
                        "cookies": true,
                        "fileSystems": true,
                        "indexedDB": true,
                        "localStorage": true,
                        "serviceWorkers": true,
                        "webSQL": true
                    },
                    () => {
                        console.log("COOKIE MONSTER: Browsing data cleared for origin");
                    }
                );
            }
        }

        // If we are cleaning up because of navigation (not tab close), we should probably clear the tracked cookies for this tab
        // so they don't get deleted *again* if the user navigates back or closes the tab later.
        // However, if we navigate back, we might want to track new ones.
        // For now, let's clear the tracked cookies for this tab in the map if we just cleaned them up.
        // BUT, we need to be careful. If this is called from onRemoved, the map entry is deleted anyway.
        // If called from onUpdated, we should clear the set for this tab so we start fresh for the new page.
        if (tabCookiesMap[tabId]) {
            tabCookiesMap[tabId].clear();
        }
    });
}