# x-api-cli 🐦

A minimalist Node.js CLI for posting to X (Twitter) using the official API (OAuth 1.0a).

Ideal for:
- Bots and automation scripts
- Bypassing "bot detection" that blocks cookie-based scrapers/posters
- CI/CD pipelines
- Quick terminal posting

## Installation

```bash
git clone https://github.com/your-username/x-api-cli.git
cd x-api-cli
npm install
npm link # Optional: makes 'x-post' and 'x-delete' available globally
```

## Configuration

You need X API credentials (API Key, Secret, Access Token, Access Secret).
Get them from the [X Developer Portal](https://developer.x.com/en/portal/dashboard) (Free Tier works for posting).

**Option 1: Environment Variables**
```bash
export X_API_KEY="your-consumer-key"
export X_API_SECRET="your-consumer-secret"
export X_ACCESS_TOKEN="your-access-token"
export X_ACCESS_SECRET="your-access-token-secret"
```

**Option 2: JSON Config File**
Create a file named `x-api.json` or `.x-api.json` in the current directory (or `~/.config/x-api.json`):
```json
{
  "consumerKey": "your-consumer-key",
  "consumerSecret": "your-consumer-secret",
  "accessToken": "your-access-token",
  "accessTokenSecret": "your-access-token-secret"
}
```

## Usage

### Posting

```bash
# Basic post
node x-post.mjs "Hello world from the CLI!"

# Reply to a tweet
node x-post.mjs "This is a reply" --reply-to 1234567890

# Quote tweet
node x-post.mjs "Check this out" --quote-url https://x.com/user/status/1234567890
```

### Deleting

```bash
node x-delete.mjs 1234567890
```

## License

MIT
