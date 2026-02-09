#!/usr/bin/env node
import { TwitterApi } from 'twitter-api-v2';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

function loadCredentials() {
  if (process.env.X_API_KEY && process.env.X_ACCESS_TOKEN) {
    return {
      consumerKey: process.env.X_API_KEY,
      consumerSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessTokenSecret: process.env.X_ACCESS_SECRET,
    };
  }
  const configPaths = [
    join(process.cwd(), 'x-api.json'),
    join(process.cwd(), '.x-api.json'),
    join(homedir(), '.config', 'x-api.json'),
    join(homedir(), '.clawdbot', 'secrets', 'x-api.json')
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

const credentials = loadCredentials();
if (!credentials) {
  console.error('❌ No credentials found');
  process.exit(1);
}

const client = new TwitterApi({
  appKey: credentials.consumerKey,
  appSecret: credentials.consumerSecret,
  accessToken: credentials.accessToken,
  accessSecret: credentials.accessTokenSecret,
});

const tweetIds = process.argv.slice(2);
if (tweetIds.length === 0) {
  console.error('Usage: x-delete <tweet-id> [<tweet-id>...]');
  process.exit(1);
}

for (const tweetId of tweetIds) {
  try {
    await client.v2.deleteTweet(tweetId);
    console.log(`✅ Deleted: ${tweetId}`);
  } catch (err) {
    console.error(`❌ Failed to delete ${tweetId}:`, err.message);
  }
}
