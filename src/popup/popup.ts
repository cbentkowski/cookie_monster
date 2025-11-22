import { websiteListKey } from '../constants';

document.addEventListener('DOMContentLoaded', () => {
    const websiteListElement = document.getElementById('website-list');
    const addButton = document.getElementById('add-website');
    const websiteInput = document.getElementById('website-input') as HTMLInputElement;

    loadWebsiteList();

    addButton.addEventListener('click', () => {
        const website = websiteInput.value.trim();
        if (website) {
            console.log('Adding website:', website);
            addWebsite(website);
            console.log('Website added:', website);
            websiteInput.value = '';
        }
    });
});

function loadWebsiteList() {
    chrome.storage.sync.get([websiteListKey], (result) => {
        const websites = result[websiteListKey] || [];
        const websiteListElement = document.getElementById('website-list');
        websiteListElement.innerHTML = '';
        websites.forEach(website => {
            const listItem = document.createElement('li');
            listItem.textContent = website;
            websiteListElement.appendChild(listItem);
        });
    });
}

function addWebsite(website) {
    chrome.storage.sync.get([websiteListKey], (result) => {
        const websites = result[websiteListKey] || [];
        if (!websites.includes(website)) {
            websites.push(website);
            chrome.storage.sync.set({ [websiteListKey]: websites }, loadWebsiteList);
        }
    });
}