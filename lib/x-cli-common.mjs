import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const REQUIRED_CREDENTIAL_KEYS = [
  'consumerKey',
  'consumerSecret',
  'accessToken',
  'accessTokenSecret',
];

export const POST_USAGE =
  'Usage: x-post <tweet text> [--reply-to <tweet-id>] [--quote <tweet-id> | --quote-url <url>] [--config <path>]';
export const DELETE_USAGE =
  'Usage: x-delete <tweet-id> [<tweet-id>...] [--config <path>]';

function hasValue(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function getMissingCredentialKeys(credentials) {
  return REQUIRED_CREDENTIAL_KEYS.filter((key) => !hasValue(credentials[key]));
}

function parseOptionValue(args, index, optionName) {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    return { error: `Missing value for ${optionName}.` };
  }
  return { value };
}

export function normalizeTweetId(value) {
  if (!value) return null;
  const id = String(value).trim();
  if (!/^\d+$/.test(id)) return null;
  return id;
}

export function extractTweetIdFromUrl(url) {
  if (!url) return null;
  const match = String(url).match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

export function parsePostArgs(args) {
  const parsed = {
    help: false,
    configPath: null,
    replyTo: null,
    quoteTo: null,
    text: '',
    error: null,
  };

  const textParts = [];
  let parseOptions = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (parseOptions && arg === '--') {
      parseOptions = false;
      continue;
    }

    if (parseOptions && (arg === '--help' || arg === '-h')) {
      return { ...parsed, help: true };
    }

    if (parseOptions && (arg === '--config' || arg === '-c')) {
      const { value, error } = parseOptionValue(args, i, arg);
      if (error) return { ...parsed, error };
      parsed.configPath = value;
      i += 1;
      continue;
    }

    if (parseOptions && (arg === '--reply-to' || arg === '-r')) {
      const { value, error } = parseOptionValue(args, i, arg);
      if (error) return { ...parsed, error };
      const tweetId = normalizeTweetId(value);
      if (!tweetId) {
        return { ...parsed, error: `Invalid tweet ID for ${arg}: "${value}".` };
      }
      parsed.replyTo = tweetId;
      i += 1;
      continue;
    }

    if (parseOptions && arg === '--quote') {
      const { value, error } = parseOptionValue(args, i, arg);
      if (error) return { ...parsed, error };
      const tweetId = normalizeTweetId(value);
      if (!tweetId) {
        return { ...parsed, error: `Invalid tweet ID for ${arg}: "${value}".` };
      }
      parsed.quoteTo = tweetId;
      i += 1;
      continue;
    }

    if (parseOptions && arg === '--quote-url') {
      const { value, error } = parseOptionValue(args, i, arg);
      if (error) return { ...parsed, error };
      const tweetId = extractTweetIdFromUrl(value);
      if (!tweetId) {
        return {
          ...parsed,
          error: `Failed to parse tweet ID from --quote-url value: "${value}".`,
        };
      }
      parsed.quoteTo = tweetId;
      i += 1;
      continue;
    }

    if (parseOptions && arg.startsWith('-')) {
      return { ...parsed, error: `Unknown option: ${arg}` };
    }

    textParts.push(arg);
  }

  if (parsed.replyTo && parsed.quoteTo) {
    return {
      ...parsed,
      error: 'Cannot use --reply-to and --quote/--quote-url together.',
    };
  }

  parsed.text = textParts.join(' ').trim();
  if (!parsed.text) {
    return {
      ...parsed,
      error: 'Missing tweet text. Use --help for examples.',
    };
  }

  return parsed;
}

export function parseDeleteArgs(args) {
  const parsed = {
    help: false,
    configPath: null,
    tweetIds: [],
    error: null,
  };

  let parseOptions = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (parseOptions && arg === '--') {
      parseOptions = false;
      continue;
    }

    if (parseOptions && (arg === '--help' || arg === '-h')) {
      return { ...parsed, help: true };
    }

    if (parseOptions && (arg === '--config' || arg === '-c')) {
      const { value, error } = parseOptionValue(args, i, arg);
      if (error) return { ...parsed, error };
      parsed.configPath = value;
      i += 1;
      continue;
    }

    if (parseOptions && arg.startsWith('-')) {
      return { ...parsed, error: `Unknown option: ${arg}` };
    }

    const tweetId = normalizeTweetId(arg);
    if (!tweetId) {
      return { ...parsed, error: `Invalid tweet ID: "${arg}".` };
    }
    parsed.tweetIds.push(tweetId);
  }

  if (parsed.tweetIds.length === 0) {
    return {
      ...parsed,
      error: 'At least one tweet ID is required. Use --help for examples.',
    };
  }

  return parsed;
}

function buildConfigPaths({ cwd, home, configPath, envConfigPath, includeLegacy }) {
  const paths = [];

  if (configPath) paths.push(configPath);
  if (envConfigPath) paths.push(envConfigPath);

  paths.push(join(cwd, 'x-api.json'));
  paths.push(join(cwd, '.x-api.json'));
  paths.push(join(home, '.config', 'x-api.json'));

  if (includeLegacy) {
    paths.push(join(home, '.clawdbot', 'secrets', 'x-api.json'));
  }

  return [...new Set(paths)];
}

export function loadCredentials(options = {}) {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const home = options.home ?? homedir();
  const includeLegacyPaths =
    options.includeLegacyPaths ?? env.X_API_USE_LEGACY_PATHS === '1';
  const fileExists = options.existsSyncFn ?? existsSync;
  const readFile = options.readFileSyncFn ?? readFileSync;

  const envCredentials = {
    consumerKey: env.X_API_KEY,
    consumerSecret: env.X_API_SECRET,
    accessToken: env.X_ACCESS_TOKEN,
    accessTokenSecret: env.X_ACCESS_SECRET,
  };

  const hasAnyEnvCredential = Object.values(envCredentials).some(hasValue);
  if (hasAnyEnvCredential) {
    const missingKeys = getMissingCredentialKeys(envCredentials);
    if (missingKeys.length > 0) {
      return {
        credentials: null,
        error: `Missing environment variables: ${missingKeys.join(', ')}`,
        source: 'env',
        searchedPaths: [],
      };
    }

    return {
      credentials: envCredentials,
      error: null,
      source: 'env',
      searchedPaths: [],
    };
  }

  const configPaths = buildConfigPaths({
    cwd,
    home,
    configPath: options.configPath,
    envConfigPath: env.X_API_CONFIG,
    includeLegacy: includeLegacyPaths,
  });

  for (const configPath of configPaths) {
    if (!fileExists(configPath)) continue;

    let rawConfig;
    try {
      rawConfig = JSON.parse(readFile(configPath, 'utf8'));
    } catch (error) {
      return {
        credentials: null,
        error: `Failed to parse credentials file (${configPath}): ${error.message}`,
        source: configPath,
        searchedPaths: configPaths,
      };
    }

    const credentials = {
      consumerKey: rawConfig.consumerKey,
      consumerSecret: rawConfig.consumerSecret,
      accessToken: rawConfig.accessToken,
      accessTokenSecret: rawConfig.accessTokenSecret,
    };

    const missingKeys = getMissingCredentialKeys(credentials);
    if (missingKeys.length > 0) {
      return {
        credentials: null,
        error: `Credentials file is missing required fields (${configPath}): ${missingKeys.join(', ')}`,
        source: configPath,
        searchedPaths: configPaths,
      };
    }

    return {
      credentials,
      error: null,
      source: configPath,
      searchedPaths: configPaths,
    };
  }

  return {
    credentials: null,
    error: 'No credentials found.',
    source: null,
    searchedPaths: configPaths,
  };
}

export function getCredentialHelpText(searchedPaths = []) {
  const searched = searchedPaths.length
    ? `\nSearched config paths:\n${searchedPaths.map((path) => `  - ${path}`).join('\n')}`
    : '';

  return `Set environment variables:
  export X_API_KEY="..."
  export X_API_SECRET="..."
  export X_ACCESS_TOKEN="..."
  export X_ACCESS_SECRET="..."

Or create x-api.json:
  {
    "consumerKey": "...",
    "consumerSecret": "...",
    "accessToken": "...",
    "accessTokenSecret": "..."
  }${searched}`;
}

export function getPostHelpText() {
  return `${POST_USAGE}

Examples:
  x-post "Hello world from CLI!"
  x-post "Reply text" --reply-to 1234567890
  x-post "Check this out" --quote-url https://x.com/user/status/1234567890
  x-post --config ./secrets/x-api.json "Configured path example"

Use -- before text that starts with a dash:
  x-post -- "--not-a-flag"
`;
}

export function getDeleteHelpText() {
  return `${DELETE_USAGE}

Examples:
  x-delete 1234567890
  x-delete 12345 67890
  x-delete --config ./secrets/x-api.json 1234567890
`;
}
