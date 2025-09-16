const axios = require('axios');
const { diff } = require('deep-diff');

const WEBHOOK_URL = 'https://hooks.airtable.com/workflows/v1/genericWebhook/appnIDvEOHZeznEys/wflEElnCg9y67vkUS/wtrE8ue2yIU4a8k8b';
const DATA_URL = 'https://raw.githubusercontent.com/Navdeep-Codes/Siege-Monitor/main/store.json';

async function downloadJson(url) {
    const res = await axios.get(url);
    return res.data;
}

async function sendWebhook(changes) {
    await axios.post(WEBHOOK_URL, {
        content: `Changes detected:\n${JSON.stringify(changes, null, 2)}`
    });
}

(async () => {
    const firstData = await downloadJson(DATA_URL);
    setTimeout(async () => {
        const secondData = await downloadJson(DATA_URL);
        const changes = diff(firstData, secondData);
        if (changes) {
            await sendWebhook(changes);
        }
    }, 30000);
})();