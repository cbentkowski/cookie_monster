# Privacy Policy for Cookie Monster

**Effective Date:** November 22, 2025

## Overview
Cookie Monster is a Chrome extension designed to automatically delete cookies and browsing data for specific websites when you close their tabs. This privacy policy explains how the extension handles your data.

## Data Collection
**Cookie Monster does NOT collect, store, transmit, or share any personal data.**

Specifically:
- We do not collect browsing history
- We do not collect personal information
- We do not track your activity
- We do not send any data to external servers
- We do not use analytics or tracking tools

## Data Storage
The extension stores only one piece of information locally on your device:
- **Website List**: The list of websites you choose to track (e.g., "cnn.com")

This data:
- Is stored locally in your browser using Chrome's storage API
- Never leaves your device
- Is only accessible by the extension
- Can be deleted at any time through the extension's options page

## Permissions Explanation
Cookie Monster requires certain permissions to function:

### Required Permissions:
- **tabs**: To detect when you close a tab
- **cookies**: To delete cookies for tracked websites
- **storage**: To save your list of tracked websites locally
- **webRequest**: To identify third-party cookies set by network requests
- **browsingData**: To clear local storage, cache, and other site data

### Host Permissions:
- **`<all_urls>`**: Required to monitor all websites so the extension can detect when you close a tab for a tracked site and delete its cookies accordingly

**Important**: Despite having access to all URLs, the extension ONLY acts on websites you explicitly add to your tracking list. It does not monitor, collect, or transmit any data from any website.

## Third-Party Services
Cookie Monster does not use any third-party services, analytics, or tracking tools.

## Changes to Privacy Policy
Any changes to this privacy policy will be posted in this document and on the extension's GitHub repository.

## Contact
For questions or concerns about this privacy policy, please open an issue on the [GitHub repository](https://github.com/cbentkowski/cookie_monster).

## Open Source
Cookie Monster is open source. You can review the complete source code at:
https://github.com/cbentkowski/cookie_monster
