#!/usr/bin/env node
// Post to X using official API (OAuth 1.0a)
// Credentials: env vars (X_API_KEY, etc.) or x-api.json

import { TwitterApi } from 'twitter-api-v2';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Load credentials from env vars or config file
function loadCredentials() {
  // Try environment variables first
  if (process.env.X_API_KEY && process.env.X_ACCESS_TOKEN) {
    return {
      consumerKey: process.env.X_API_KEY,
      consumerSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessTokenSecret: process.env.X_ACCESS_SECRET,
    };
  }

  // Fall back to config file
  const configPaths = [
    join(process.cwd(), 'x-api.json'),
    join(process.cwd(), '.x-api.json'),
    join(homedir(), '.config', 'x-api.json'),
    join(homedir(), '.clawdbot', 'secrets', 'x-api.json') // Legacy support
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, 'utf8'));
      } catch (e) {
        console.error(`❌ Failed to parse ${configPath}:`, e.message);
      }
    }
  }

  return null;
}

function extractTweetIdFromUrl(url) {
  if (!url) return null;
  const m = String(url).match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

const credentials = loadCredentials();

if (!credentials) {
  console.error(`❌ No credentials found.

Set environment variables:
  export X_API_KEY="..."
  export X_API_SECRET="..."
  export X_ACCESS_TOKEN="..."
  export X_ACCESS_SECRET="..."

Or create a 'x-api.json' file:
  {
    "consumerKey": "...",
    "consumerSecret": "...",
    "accessToken": "...",
    "accessTokenSecret": "..."
  }
`);
  process.exit(1);
}

const client = new TwitterApi({
  appKey: credentials.consumerKey,
  appSecret: credentials.consumerSecret,
  accessToken: credentials.accessToken,
  accessSecret: credentials.accessTokenSecret,
});

const args = process.argv.slice(2);
let replyTo = null;
let quoteTo = null;
const textParts = [];

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--reply-to' || a === '-r') {
    replyTo = args[i + 1];
    i++; 
  } else if (a === '--quote') {
    quoteTo = args[i + 1];
    i++;
  } else if (a === '--quote-url') {
    const id = extractTweetIdFromUrl(args[i + 1]);
    if (!id) {
      console.error('❌ Failed to parse tweet id from --quote-url');
      process.exit(1);
    }
    quoteTo = id;
    i++;
  } else {
    textParts.push(a);
  }
}

const text = textParts.join(' ');

if (!text) {
  console.error('Usage: x-post <tweet text> [--reply-to <tweet-id>] [--quote <tweet-id> | --quote-url <url>]');
  process.exit(1);
}

if (replyTo && quoteTo) {
  console.error('❌ Cannot use --reply-to and --quote together. Pick one.');
  process.exit(1);
}

try {
  const payload = { text };

  if (replyTo) {
    payload.reply = { in_reply_to_tweet_id: replyTo };
  }

  if (quoteTo) {
    payload.quote_tweet_id = quoteTo;
  }

  const { data } = await client.v2.tweet(payload);
  console.log(`✅ Posted: https://x.com/i/status/${data.id}`);
} catch (err) {
  console.error('❌ Failed:', err.message);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
}
