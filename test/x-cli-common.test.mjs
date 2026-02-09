import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractTweetIdFromUrl,
  loadCredentials,
  normalizeTweetId,
  parseDeleteArgs,
  parsePostArgs,
} from '../lib/x-cli-common.mjs';

test('normalizeTweetId accepts numeric values', () => {
  assert.equal(normalizeTweetId('123456'), '123456');
  assert.equal(normalizeTweetId(987654321), '987654321');
});

test('normalizeTweetId rejects invalid values', () => {
  assert.equal(normalizeTweetId('abc123'), null);
  assert.equal(normalizeTweetId('-123'), null);
  assert.equal(normalizeTweetId(''), null);
});

test('extractTweetIdFromUrl extracts from X status URL', () => {
  assert.equal(
    extractTweetIdFromUrl('https://x.com/example/status/1234567890'),
    '1234567890'
  );
  assert.equal(extractTweetIdFromUrl('not-a-url'), null);
});

test('parsePostArgs handles help safely', () => {
  const result = parsePostArgs(['--help']);
  assert.equal(result.help, true);
  assert.equal(result.error, null);
});

test('parsePostArgs parses reply target and text', () => {
  const result = parsePostArgs(['Hello', 'world', '--reply-to', '123']);
  assert.equal(result.error, null);
  assert.equal(result.text, 'Hello world');
  assert.equal(result.replyTo, '123');
  assert.equal(result.quoteTo, null);
});

test('parsePostArgs parses quote URL', () => {
  const result = parsePostArgs([
    'Quoted',
    'tweet',
    '--quote-url',
    'https://x.com/user/status/456',
  ]);
  assert.equal(result.error, null);
  assert.equal(result.quoteTo, '456');
});

test('parsePostArgs rejects unknown options', () => {
  const result = parsePostArgs(['hello', '--wat']);
  assert.match(result.error, /Unknown option/);
});

test('parsePostArgs rejects conflicting reply and quote options', () => {
  const result = parsePostArgs([
    'hello',
    '--reply-to',
    '1',
    '--quote',
    '2',
  ]);
  assert.match(result.error, /Cannot use --reply-to/);
});

test('parsePostArgs supports -- separator for dash-prefixed text', () => {
  const result = parsePostArgs(['--', '--help']);
  assert.equal(result.error, null);
  assert.equal(result.text, '--help');
});

test('parseDeleteArgs parses IDs and config path', () => {
  const result = parseDeleteArgs(['--config', '/tmp/creds.json', '1', '2']);
  assert.equal(result.error, null);
  assert.deepEqual(result.tweetIds, ['1', '2']);
  assert.equal(result.configPath, '/tmp/creds.json');
});

test('parseDeleteArgs rejects invalid IDs', () => {
  const result = parseDeleteArgs(['abc']);
  assert.match(result.error, /Invalid tweet ID/);
});

test('loadCredentials prefers complete env credentials', () => {
  const result = loadCredentials({
    env: {
      X_API_KEY: 'key',
      X_API_SECRET: 'secret',
      X_ACCESS_TOKEN: 'token',
      X_ACCESS_SECRET: 'token-secret',
    },
  });

  assert.equal(result.error, null);
  assert.deepEqual(result.credentials, {
    consumerKey: 'key',
    consumerSecret: 'secret',
    accessToken: 'token',
    accessTokenSecret: 'token-secret',
  });
  assert.equal(result.source, 'env');
});

test('loadCredentials rejects partial env credentials', () => {
  const result = loadCredentials({
    env: {
      X_API_KEY: 'key',
      X_ACCESS_TOKEN: 'token',
    },
  });

  assert.equal(result.credentials, null);
  assert.match(result.error, /Missing environment variables/);
});

test('loadCredentials loads credentials from config path', () => {
  const files = new Map([
    [
      '/workspace/custom-creds.json',
      JSON.stringify({
        consumerKey: 'file-key',
        consumerSecret: 'file-secret',
        accessToken: 'file-token',
        accessTokenSecret: 'file-token-secret',
      }),
    ],
  ]);

  const result = loadCredentials({
    env: {},
    cwd: '/workspace',
    home: '/home/user',
    configPath: '/workspace/custom-creds.json',
    existsSyncFn: (path) => files.has(path),
    readFileSyncFn: (path) => files.get(path),
  });

  assert.equal(result.error, null);
  assert.equal(result.source, '/workspace/custom-creds.json');
  assert.equal(result.credentials.consumerKey, 'file-key');
});

test('loadCredentials returns no credentials when nothing is configured', () => {
  const result = loadCredentials({
    env: {},
    cwd: '/workspace',
    home: '/home/user',
    existsSyncFn: () => false,
  });

  assert.equal(result.credentials, null);
  assert.match(result.error, /No credentials found/);
  assert.deepEqual(result.searchedPaths, [
    '/workspace/x-api.json',
    '/workspace/.x-api.json',
    '/home/user/.config/x-api.json',
  ]);
});
