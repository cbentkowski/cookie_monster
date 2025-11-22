const websiteListKey = 'websiteList';

document.addEventListener('DOMContentLoaded', () => {
    console.log('COOKIE MONSTER: Options page loaded');
    loadWebsiteList();
    const addBtn = document.getElementById('addWebsite');
    if (addBtn) {
        addBtn.addEventListener('click', addWebsite);
    }
});

function loadWebsiteList() {
    console.log('COOKIE MONSTER: Loading website list...');
    chrome.storage.local.get(websiteListKey, (data) => {
        if (chrome.runtime.lastError) {
            console.error('COOKIE MONSTER: Error loading website list:', chrome.runtime.lastError);
            return;
        }
        const websiteList = data[websiteListKey] || [];
        console.log('COOKIE MONSTER: Website list loaded:', websiteList);
        const listElement = document.getElementById('websiteList');
        if (!listElement) return;

        listElement.innerHTML = '';

        websiteList.forEach((website: string) => {
            const row = document.createElement('tr');

            const siteCell = document.createElement('td');
            siteCell.textContent = website;
            row.appendChild(siteCell);

            const actionCell = document.createElement('td');
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.className = 'remove-btn';
            removeButton.onclick = () => removeWebsite(website);
            actionCell.appendChild(removeButton);
            row.appendChild(actionCell);

            listElement.appendChild(row);
        });
    });
}

function addWebsite(event: Event) {
    event.preventDefault();
    const websiteInput = document.getElementById('websiteInput') as HTMLInputElement;
    const website = websiteInput.value.trim();
    console.log('COOKIE MONSTER: Attempting to add website:', website);

    if (website) {
        chrome.storage.local.get(websiteListKey, (data) => {
            const websiteList = data[websiteListKey] || [];
            if (!websiteList.includes(website)) {
                websiteList.push(website);
                chrome.storage.local.set({ [websiteListKey]: websiteList }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('COOKIE MONSTER: Error saving website:', chrome.runtime.lastError);
                    } else {
                        console.log('COOKIE MONSTER: Website added successfully:', website);
                        loadWebsiteList();
                        websiteInput.value = '';
                    }
                });
            } else {
                console.warn('COOKIE MONSTER: Website already exists in list:', website);
                alert('Website already in the list.');
            }
        });
    }
}

function removeWebsite(website: string) {
    console.log('COOKIE MONSTER: Attempting to remove website:', website);
    chrome.storage.local.get(websiteListKey, (data) => {
        const websiteList = data[websiteListKey] || [];
        const updatedList = websiteList.filter((item: string) => item !== website);
        chrome.storage.local.set({ [websiteListKey]: updatedList }, () => {
            if (chrome.runtime.lastError) {
                console.error('COOKIE MONSTER: Error removing website:', chrome.runtime.lastError);
            } else {
                console.log('COOKIE MONSTER: Website removed successfully:', website);
                loadWebsiteList();
            }
        });
    });
}