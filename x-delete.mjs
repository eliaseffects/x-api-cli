#!/usr/bin/env node
import { TwitterApi } from 'twitter-api-v2';
import {
  getCredentialHelpText,
  getDeleteHelpText,
  loadCredentials,
  parseDeleteArgs,
} from './lib/x-cli-common.mjs';

const parsed = parseDeleteArgs(process.argv.slice(2));

if (parsed.help) {
  console.log(getDeleteHelpText());
  process.exit(0);
}

if (parsed.error) {
  console.error(`❌ ${parsed.error}`);
  console.error(getDeleteHelpText());
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

let hasFailures = false;
for (const tweetId of parsed.tweetIds) {
  try {
    await client.v2.deleteTweet(tweetId);
    console.log(`✅ Deleted: ${tweetId}`);
  } catch (error) {
    hasFailures = true;
    console.error(`❌ Failed to delete ${tweetId}: ${error.message}`);
    if (error.data) {
      console.error(JSON.stringify(error.data, null, 2));
    }
  }
}

if (hasFailures) {
  process.exit(1);
}
