#!/usr/bin/env node
import { TwitterApi } from 'twitter-api-v2';
import {
  getCredentialHelpText,
  getPostHelpText,
  loadCredentials,
  parsePostArgs,
} from './lib/x-cli-common.mjs';

const parsed = parsePostArgs(process.argv.slice(2));

if (parsed.help) {
  console.log(getPostHelpText());
  process.exit(0);
}

if (parsed.error) {
  console.error(`❌ ${parsed.error}`);
  console.error(getPostHelpText());
  process.exit(1);
}

const credentialState = loadCredentials({ configPath: parsed.configPath });
if (!credentialState.credentials) {
  console.error(`❌ ${credentialState.error}`);
  console.error(getCredentialHelpText(credentialState.searchedPaths));
  process.exit(1);
}

const client = new TwitterApi({
  appKey: credentialState.credentials.consumerKey,
  appSecret: credentialState.credentials.consumerSecret,
  accessToken: credentialState.credentials.accessToken,
  accessSecret: credentialState.credentials.accessTokenSecret,
});

const payload = { text: parsed.text };
if (parsed.replyTo) {
  payload.reply = { in_reply_to_tweet_id: parsed.replyTo };
}
if (parsed.quoteTo) {
  payload.quote_tweet_id = parsed.quoteTo;
}

try {
  const { data } = await client.v2.tweet(payload);
  console.log(`✅ Posted: https://x.com/i/status/${data.id}`);
} catch (error) {
  console.error('❌ Failed to post tweet:', error.message);
  if (error.data) {
    console.error(JSON.stringify(error.data, null, 2));
  }
  process.exit(1);
}
