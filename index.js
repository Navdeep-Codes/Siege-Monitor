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
            console.log("New items:", newItems);
            console.log("Edited items:", editedItems);
            console.log("Removed items:", removedItems);
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