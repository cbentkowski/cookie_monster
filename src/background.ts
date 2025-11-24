const tabUrlMap: { [tabId: number]: string } = {};
const tabCookiesMap: { [tabId: number]: Set<string> } = {}; // Stores "name|domain|storeId" strings

// Initialize alarm for periodic sweep
chrome.alarms.create("cookieSweep", { periodInMinutes: 5 });

// Periodic sweep listener
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "cookieSweep") {
        console.log("COOKIE MONSTER: Starting periodic cookie sweep...");
        performPeriodicSweep();
    }
});

/**
 * Performs the periodic sweep to clean up cookies for tracked sites that are not currently open.
 */
function performPeriodicSweep() {
    chrome.storage.local.get("websiteList", (data) => {
        const trackedWebsites: string[] = data.websiteList || [];
        if (trackedWebsites.length === 0) return;

        // Get all open tabs to check which sites are active
        chrome.tabs.query({}, (tabs) => {
            const openUrls = tabs.map(t => t.url).filter(u => u !== undefined) as string[];

            trackedWebsites.forEach(website => {
                // Check if this website is currently open in any tab
                const isOpen = openUrls.some(url => url.includes(website));

                if (!isOpen) {
                    // Site is not open, perform cleanup
                    // console.log(`COOKIE MONSTER: Site ${website} is not open. Checking for cookies to clean...`);

                    // Load known cookies for this site
                    const storageKey = `knownCookies_${website}`;
                    chrome.storage.local.get(storageKey, (cookieData) => {
                        const knownCookies = cookieData[storageKey] || [];
                        if (knownCookies.length > 0) {
                            const cookiesToClean = new Set(knownCookies.map((c: any) => JSON.stringify(c))) as Set<string>;
                            performCleanup(website, `https://${website}`, cookiesToClean, "Periodic Sweep");
                        } else {
                            // Even if no specific 3rd party cookies are known, we should try to clean 1st party
                            // But performCleanup expects a Set. Let's pass empty set.
                            // Actually performCleanup handles empty set fine for 3rd party, and proceeds to 1st party.
                            performCleanup(website, `https://${website}`, new Set(), "Periodic Sweep");
                        }
                    });
                } else {
                    // console.log(`COOKIE MONSTER: Site ${website} is currently open. Skipping sweep.`);
                }
            });
        });
    });
}

/**
 * Helper to add a cookie to persistent storage for a tracked website.
 */
function addCookieToStorage(websiteDomain: string, name: string, domain: string) {
    const storageKey = `knownCookies_${websiteDomain}`;
    chrome.storage.local.get(storageKey, (data) => {
        let knownCookies = data[storageKey] || [];

        // Check if already exists
        const exists = knownCookies.some((c: any) => c.name === name && c.domain === domain);
        if (!exists) {
            knownCookies.push({ name, domain });
            chrome.storage.local.set({ [storageKey]: knownCookies });
            // console.log(`COOKIE MONSTER: Recorded new cookie for ${websiteDomain}: ${name} (${domain})`);
        }
    });
}


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

// Track cookies set by network requests (Response Headers)
chrome.webRequest.onResponseStarted.addListener(
    (details) => {
        if (details.tabId === -1) return;

        const responseHeaders = details.responseHeaders;
        if (responseHeaders) {
            responseHeaders.forEach((header) => {
                if (header.name.toLowerCase() === 'set-cookie' && header.value) {
                    processCookieHeader(details.tabId, details.url, header.value);
                }
            });
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

// Track cookies sent in network requests (Request Headers)
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.tabId === -1) return;

        const requestHeaders = details.requestHeaders;
        if (requestHeaders) {
            requestHeaders.forEach((header) => {
                if (header.name.toLowerCase() === 'cookie' && header.value) {
                    // Cookie header format: name=value; name2=value2
                    const cookies = header.value.split(';');
                    cookies.forEach(cookieStr => {
                        processCookieHeader(details.tabId, details.url, cookieStr.trim());
                    });
                }
            });
        }
        return {};
    },
    { urls: ["<all_urls>"] },
    ["requestHeaders"]
);

function processCookieHeader(tabId: number, requestUrl: string, cookieString: string) {
    // Handle both Set-Cookie (full string) and Cookie (name=value)
    // For Set-Cookie, we might have attributes like Domain=...
    // For Cookie, we only have name=value, so we must infer domain from requestUrl

    const cookieParts = cookieString.split(';');
    const namePart = cookieParts[0];
    const name = namePart.split('=')[0].trim();

    let domain = '';

    // Try to find domain attribute (only present in Set-Cookie)
    const domainPart = cookieParts.find(part => part.trim().toLowerCase().startsWith('domain='));
    if (domainPart) {
        domain = domainPart.split('=')[1].trim();
    } else {
        try {
            domain = new URL(requestUrl).hostname;
        } catch (e) {
            // console.error('COOKIE MONSTER: Error parsing URL for cookie domain:', requestUrl);
            return;
        }
    }

    // Normalize domain (remove leading dot)
    if (domain.startsWith('.')) {
        domain = domain.substring(1);
    }

    // 1. Add to in-memory map for current session cleanup
    if (!tabCookiesMap[tabId]) {
        tabCookiesMap[tabId] = new Set();
    }
    tabCookiesMap[tabId].add(JSON.stringify({ name, domain }));

    // 2. Check if this belongs to a tracked site and add to persistent storage
    // We need to know which tracked site this request belongs to.
    // We can check the tab's current URL from tabUrlMap
    const tabUrl = tabUrlMap[tabId];
    if (tabUrl) {
        chrome.storage.local.get("websiteList", (data) => {
            const websites = data.websiteList || [];
            const matchedWebsite = websites.find((website: string) => tabUrl.includes(website));
            if (matchedWebsite) {
                addCookieToStorage(matchedWebsite, name, domain);
            }
        });
    }
}


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
    // Create a copy of the cookies to clean, as the original set will be cleared/deleted
    const cookiesToClean = new Set(trackedCookies || []);

    chrome.storage.local.get("websiteList", (data) => {
        const websites = data.websiteList || [];
        const matchedWebsite = websites.find((website: string) => url.includes(website));

        if (matchedWebsite) {
            console.log(`COOKIE MONSTER: Session ended for tracked site: ${matchedWebsite} (Tab: ${tabId})`);

            // 1. Immediate Cleanup
            performCleanup(matchedWebsite, url, cookiesToClean, "Immediate");

            // 2. Delayed Cleanup (Double Tap) to catch late-arriving cookies
            setTimeout(() => {
                performCleanup(matchedWebsite, url, cookiesToClean, "Delayed");
            }, 2000);
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

/**
 * Executes the actual cookie and storage cleanup.
 * @param matchedWebsite The tracked website domain/string that was matched.
 * @param url The full URL of the page that was visited.
 * @param trackedCookies A Set of JSON strings representing the 3rd party cookies to clean.
 * @param phase Label for logging (e.g., "Immediate", "Delayed").
 */
function performCleanup(matchedWebsite: string, url: string, trackedCookies: Set<string>, phase: string) {
    console.log(`COOKIE MONSTER: [${phase}] Running cleanup for ${matchedWebsite}`);

    // 1. Delete tracked 3rd party cookies
    if (trackedCookies && trackedCookies.size > 0) {
        console.log(`COOKIE MONSTER: [${phase}] Found ${trackedCookies.size} tracked cookies to delete.`);
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
                            // console.warn(`COOKIE MONSTER: Failed to remove tracked cookie ${cookie.name} from ${cookieUrl}:`, chrome.runtime.lastError.message);
                        }
                    });
                });

            } catch (e) {
                console.error("COOKIE MONSTER: Error parsing tracked cookie", e);
            }
        });
        // console.log(`COOKIE MONSTER: Deleting tracked cookies:\n${cookieList.join('\n')}`);
    } else {
        // console.log("COOKIE MONSTER: No tracked cookies found for this session.");
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
                console.log(`COOKIE MONSTER: [${phase}] Found ${cookies.length} first-party cookies for domain ${domain}. Deleting...`);
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
                            // console.warn(`COOKIE MONSTER: Failed to remove 1st party cookie ${cookie.name}:`, chrome.runtime.lastError.message);
                        }
                    });
                });
            } else {
                console.log(`COOKIE MONSTER: [${phase}] No first-party cookies found for domain ${domain}.`);
            }
        });

        // 3. Clear Storage
        // console.log(`COOKIE MONSTER: Clearing browsing data for origin: ${domain}`);
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
                // console.log("COOKIE MONSTER: Browsing data cleared for origin");
            }
        );
    }
}