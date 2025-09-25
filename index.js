const { App } = require('@slack/bolt');
const axios = require('axios');
const { diff } = require('deep-diff');
const dotenv = require('dotenv');

dotenv.config();

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN; 
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET; 
const SLACK_CHANNEL_ID = 'C09FDRR10TF'; 
const DATA_URL = 'https://raw.githubusercontent.com/Navdeep-Codes/Siege-Monitor/refs/heads/main/store-data.json';

let lastData = null;

const slackApp = new App({
    token: SLACK_BOT_TOKEN,
    signingSecret: SLACK_SIGNING_SECRET,
    socketMode: false,
    appToken: '', 
});

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
            if (Array.isArray(change.path) && change.path.includes('options')) {
                newItems.push({
                    path: change.path,
                    value: change.rhs
                });
            } else {
                newItems.push({
                    path: change.path,
                    value: change.rhs
                });
            }
        } else if (change.kind === 'E') {
            editedItems.push({
                path: change.path,
                oldValue: change.lhs,
                newValue: change.rhs
            });
        } else if (change.kind === 'D') {
            if (Array.isArray(change.path) && change.path.includes('options')) {
                removedItems.push({
                    path: change.path,
                    oldValue: change.lhs
                });
            } else {
                removedItems.push({
                    path: change.path,
                    oldValue: change.lhs
                });
            }
        }
    }
    return { newItems, editedItems, removedItems };
}

function buildNewItemBlock(item) {
    if (item.path?.includes('options')) {
        const v = item.value;
        return {
            type: "header",
            text: {
                type: "plain_text",
                text: ":new: *${v.title ?? '(none :sadge:)'}* (Option Added)",
                emoji: true
            }
        },
            {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `${v.description ?? '(none :sadge:)'}\n*Path:* ${item.path?.join(' > ')}`
            }
        },
        {
			"type": "context",
			"elements": [
				{
					"type": "mrkdwn",
					"text": "pinging @channel · :star: <https://github.com/Navdeep-Codes/Siege-Monitor/ | star the repo>"
				}
			]
		}
    }
    const v = item.value;
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: `:new: *${v.title ?? '(none :sadge:)'}* (:siege-coin: ${v?.price ?? '(none :sadge:)'})\n${v.description ?? '(none :sadge:)'}\n*Requires:* ${v.requires ?? '(none :sadge:)'}\n*Path:* ${item.path?.join(' > ')}`
        }
    };
}

function buildEditedItemBlock(item) {
    const oldV = item.oldValue || {};
    const newV = item.newValue || {};
    const path = item.path?.join(' > ');

    let lines = [':pencil2: *Edited Item*'];
    if (oldV.title !== newV.title) {
        lines.push(`*Title:* ${oldV.title ?? '(none)'} → ${newV.title ?? '(none)'}`);
    } else {
        lines.push(`*Title:* ${newV.title ?? '(none)'}`);
    }
    if (oldV.price !== newV.price) {
        lines.push(`*Price:* ${oldV.price ?? '(none)'} → ${newV.price ?? '(none)'}`);
    } else {
        lines.push(`*Price:* ${newV.price ?? '(none)'}`);
    }
    if (oldV.description !== newV.description) {
        lines.push(`*Description:* ${oldV.description ?? '(none)'} → ${newV.description ?? '(none)'}`);
    } else {
        lines.push(`*Description:* ${newV.description ?? '(none)'}`);
    }
    if (oldV.requires !== newV.requires) {
        lines.push(`*Requires:* ${oldV.requires ?? '(none)'} → ${newV.requires ?? '(none)'}`);
    } else {
        lines.push(`*Requires:* ${newV.requires ?? '(none)'}`);
    }
    lines.push(`*Path:* ${path}`);

    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: lines.join('\n')
        }
    };
}

function buildRemovedItemBlock(item) {
    const v = item.oldValue;
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: `:win10-trash: *${v.title ?? '(none :sadge:)'}* (:siege-coin: ${v?.price ?? '(none :sadge:)'})\n${v.description ?? '(none :sadge:)'}\n*Requires:* ${v.requires ?? '(none :sadge:)'}\n*Path:* ${item.path?.join(' > ')}`
        }
    };
}

async function sendSlackBlocks(blocks) {
    if (blocks.length === 0) return;
    await slackApp.client.chat.postMessage({
        channel: SLACK_CHANNEL_ID,
        blocks: blocks
    });
    console.log("Slack message sent!");
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

            const blocks = [];
            newItems.forEach(item => blocks.push(buildNewItemBlock(item)));
            editedItems.forEach(item => blocks.push(buildEditedItemBlock(item)));
            removedItems.forEach(item => blocks.push(buildRemovedItemBlock(item)));

            await sendSlackBlocks(blocks);
        } else {
            console.log("No changes detected.");
        }
    } else {
        console.log("Initial data loaded.");
    }
    lastData = newData;
}

async function sendStatusMessage(text) {
    await slackApp.client.chat.postMessage({
        channel: SLACK_CHANNEL_ID,
        text: text
    });
}

(async () => {
    await slackApp.start();
    console.log('Slack Bolt app started!');
    await sendStatusMessage(':yayayayayay: Siege Monitor is back online!');
    checkForChanges();
    setInterval(checkForChanges, 60000);
    
})();

process.on('SIGINT', async () => {
    await sendStatusMessage(':siren-real: Siege Monitor is going offline!');
    process.exit();
});
process.on('SIGTERM', async () => {
    await sendStatusMessage(':siren-real: Siege Monitor is going offline!');
    process.exit();
});


