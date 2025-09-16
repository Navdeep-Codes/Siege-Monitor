const axios = require('axios');
const { diff } = require('deep-diff');

const WEBHOOK_URL = 'https://hooks.airtable.com/workflows/v1/genericWebhook/appnIDvEOHZeznEys/wflEElnCg9y67vkUS/wtrE8ue2yIU4a8k8b';
const DATA_URL = 'https://raw.githubusercontent.com/Navdeep-Codes/Siege-Monitor/refs/heads/main/store-data.json';

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

(async () => {
    const firstData = await downloadJson(DATA_URL);
    if (!firstData) {
        console.error("First download failed, exiting.");
        return;
    }
    setTimeout(async () => {
        const secondData = await downloadJson(DATA_URL);
        if (!secondData) {
            console.error("Second download failed, exiting.");
            return;
        }
        const changes = diff(firstData, secondData);
        if (changes) {
            console.log("Changes detected:", changes);
            await sendWebhook(changes);
        } else {
            console.log("No changes detected.");
        }
    }, 30000);
})();