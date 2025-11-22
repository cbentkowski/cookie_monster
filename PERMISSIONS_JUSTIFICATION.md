# Chrome Web Store Permissions Justification

This document provides detailed justification for each permission requested by Cookie Monster, as required by the Chrome Web Store review process.

## Permission: `tabs`
**Why it's needed:**
The extension needs to detect when a browser tab is closed to trigger the cookie deletion process. The `chrome.tabs.onRemoved` listener requires this permission to function.

**How it's used:**
- Monitors tab closure events
- Retrieves the URL of the closed tab to check if it matches a tracked website
- Does NOT access tab content or browsing history

## Permission: `cookies`
**Why it's needed:**
The core functionality of the extension is to delete cookies for specified websites when their tabs are closed.

**How it's used:**
- Retrieves cookies for tracked websites using `chrome.cookies.getAll()`
- Deletes cookies using `chrome.cookies.remove()`
- Only operates on websites explicitly added by the user to the tracking list

## Permission: `storage`
**Why it's needed:**
The extension must store the user's list of tracked websites persistently.

**How it's used:**
- Stores the list of websites to track using `chrome.storage.local`
- Retrieves this list when checking if a closed tab should have its cookies deleted
- All data remains local to the user's device

## Permission: `webRequest`
**Why it's needed:**
To identify and track third-party cookies set by network requests, which cannot be detected through the standard cookies API alone.

**How it's used:**
- Monitors `Set-Cookie` headers in HTTP responses using `chrome.webRequest.onResponseStarted`
- Tracks cookies associated with specific tabs
- Enables comprehensive cookie deletion including third-party cookies

## Permission: `browsingData`
**Why it's needed:**
To clear all site-specific data (cache, local storage, service workers, etc.) in addition to cookies.

**How it's used:**
- Calls `chrome.browsingData.remove()` to clear cache, local storage, IndexedDB, and other site data
- Only clears data for websites the user has explicitly added to the tracking list
- Ensures complete privacy cleanup when a tracked tab is closed

## Host Permission: `<all_urls>`
**Why it's needed:**
The extension needs to monitor tab closures and cookie activity across all websites to determine when to act on user-specified tracked sites.

**How it's used:**
- Required by `chrome.webRequest` to monitor network requests across all domains
- Enables the extension to detect when a tracked website's tab is closed
- **IMPORTANT**: Despite having access to all URLs, the extension ONLY deletes cookies and data for websites explicitly added by the user to the tracking list

**Privacy guarantee:**
- No data is collected from any website
- No browsing activity is monitored or recorded
- The extension only acts when a tab is closed for a tracked website
- All operations are local to the user's device

## Data Privacy
**Cookie Monster does NOT:**
- Collect any personal data
- Track browsing history
- Send any data to external servers
- Use analytics or telemetry

The extension is fully open source and can be audited at:
https://github.com/cbentkowski/cookie_monster
