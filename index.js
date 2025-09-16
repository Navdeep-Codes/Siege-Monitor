const axios = require('axios');
const { diff } = require('deep-diff');

const WEBHOOK_URL = 'https://hooks.airtable.com/workflows/v1/genericWebhook/appnIDvEOHZeznEys/wflEElnCg9y67vkUS/wtrE8ue2yIU4a8k8b';
const DATA_URL = 'https://raw.githubusercontent.com/Navdeep-Codes/Siege-Monitor/refs/heads/main/store-data.json';

let lastData = null;

async function downloadJson(url) {
    try {
        const res = await axios.get(url);
        console.log("Downloaded data from:", url);
        return res.data;
    } catch (err) {
        console.error(`Failed to download JSON: ${err.message}`);
        return null;
    }
}

function extractChangeInfo(changes) {
    const newItems = [];
    const editedItems = [];
    const removedItems = [];

    if (!changes) return { newItems, editedItems, removedItems };

    for (const change of changes) {
        if (change.kind === 'N') {
            newItems.push({
                path: change.path,
                value: change.rhs
            });
        } else if (change.kind === 'E') {
            editedItems.push({
                path: change.path,
                oldValue: change.lhs,
                newValue: change.rhs
            });
        } else if (change.kind === 'D') {
            removedItems.push({
                path: change.path,
                oldValue: change.lhs
            });
        }
    }
    return { newItems, editedItems, removedItems };
}

function logChangeDetails({ newItems, editedItems, removedItems }) {
    for (const item of newItems) {
        const v = item.value;
        console.log('NEW ITEM:');
        console.log('Path:', item.path?.join(' > '));
        console.log('Title:', v.title ?? '(none)');
        console.log('Price:', v.price ?? '(none)');
        console.log('Description:', v.description ?? '(none)');
        console.log('Requires:', v.requires ?? '(none)');
    }
    for (const item of editedItems) {
        const oldV = item.oldValue;
        const newV = item.newValue;
        console.log('EDITED ITEM:');
        console.log('Path:', item.path?.join(' > '));
        console.log('Old Title:', oldV?.title ?? '(none)');
        console.log('New Title:', newV?.title ?? '(none)');
        console.log('Old Price:', oldV?.price ?? '(none)');
        console.log('New Price:', newV?.price ?? '(none)');
        console.log('Old Description:', oldV?.description ?? '(none)');
        console.log('New Description:', newV?.description ?? '(none)');
        console.log('Old Requires:', oldV?.requires ?? '(none)');
        console.log('New Requires:', newV?.requires ?? '(none)');
    }
    for (const item of removedItems) {
        const v = item.oldValue;
        console.log('REMOVED ITEM:');
        console.log('Path:', item.path?.join(' > '));
        console.log('Title:', v?.title ?? '(none)');
        console.log('Price:', v?.price ?? '(none)');
        console.log('Description:', v?.description ?? '(none)');
        console.log('Requires:', v?.requires ?? '(none)');
        console.log('---');
    }
}

async function sendWebhook(changes) {
    try {
        await axios.post(WEBHOOK_URL, {
            content: `Changes detected:\n${JSON.stringify(changes, null, 2)}`
        });
        console.log("Webhook sent!");
    } catch (err) {
        console.error("Failed to send webhook:", err.message);
    }
}

async function checkForChanges() {
    const newData = await downloadJson(DATA_URL);
    if (!newData) {
        console.error("Download failed, skipping this check.");
        return;
    }
    if (lastData) {
        const changes = diff(lastData, newData);
        if (changes) {
            console.log("Changes detected:", changes);
            const { newItems, editedItems, removedItems } = extractChangeInfo(changes);
            logChangeDetails({ newItems, editedItems, removedItems });
            await sendWebhook(changes);
        } else {
            console.log("No changes detected.");
        }
    } else {
        console.log("Initial data loaded.");
    }
    lastData = newData;
}

checkForChanges();
setInterval(checkForChanges, 60000);




