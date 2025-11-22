import { websiteListKey } from '../constants';

const itemsPerPage = 5;
let currentPage = 1;
let allWebsites: string[] = [];

document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.getElementById('add-website');
    const websiteInput = document.getElementById('website-input') as HTMLInputElement;
    const prevButton = document.getElementById('prev-page') as HTMLButtonElement;
    const nextButton = document.getElementById('next-page') as HTMLButtonElement;
    const clearStorageButton = document.getElementById('clear-storage');

    // Initial load
    loadWebsites();

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes[websiteListKey]) {
            loadWebsites();
        }
    });

    addButton.addEventListener('click', () => {
        const website = websiteInput.value.trim();
        if (website) {
            addWebsite(website);
            websiteInput.value = '';
        }
    });

    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    nextButton.addEventListener('click', () => {
        const totalPages = Math.ceil(allWebsites.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    clearStorageButton.addEventListener('click', () => {
        chrome.storage.sync.clear();
    });
});

function loadWebsites() {
    chrome.storage.sync.get([websiteListKey], (result) => {
        allWebsites = result[websiteListKey] || [];
        // If current page is out of bounds after deletion, reset to last page
        const totalPages = Math.ceil(allWebsites.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        } else if (currentPage === 0 && totalPages > 0) {
            currentPage = 1;
        }
        renderTable();
    });
}

function renderTable() {
    const websiteListElement = document.getElementById('website-list');
    websiteListElement.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = allWebsites.slice(startIndex, endIndex);

    pageItems.forEach(website => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        nameCell.textContent = website;
        row.appendChild(nameCell);

        const actionCell = document.createElement('td');
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.onclick = () => removeWebsite(website);
        actionCell.appendChild(removeButton);
        row.appendChild(actionCell);

        websiteListElement.appendChild(row);
    });

    updatePaginationControls();
}

function updatePaginationControls() {
    const prevButton = document.getElementById('prev-page') as HTMLButtonElement;
    const nextButton = document.getElementById('next-page') as HTMLButtonElement;
    const pageInfo = document.getElementById('page-info');

    const totalPages = Math.ceil(allWebsites.length / itemsPerPage);

    // Handle empty state
    if (totalPages === 0) {
        pageInfo.textContent = 'Page 0 of 0';
        prevButton.disabled = true;
        nextButton.disabled = true;
        return;
    }

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
}

function addWebsite(website: string) {
    chrome.storage.sync.get([websiteListKey], (result) => {
        const websites = result[websiteListKey] || [];
        if (!websites.includes(website)) {
            websites.push(website);
            chrome.storage.sync.set({ [websiteListKey]: websites });
        }
    });
}

function removeWebsite(website: string) {
    chrome.storage.sync.get([websiteListKey], (result) => {
        let websites = result[websiteListKey] || [];
        websites = websites.filter(w => w !== website);
        chrome.storage.sync.set({ [websiteListKey]: websites });
    });
}