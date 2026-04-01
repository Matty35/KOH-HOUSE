# KOH HOUSE — Setup Guide

Complete step-by-step instructions for deploying and configuring your KOH HOUSE gallery site.

---

## 1. Push the Repository to GitHub

If you haven't already, initialise the repo and push to GitHub:

```bash
git init
git add .
git commit -m "Initial commit — KOH HOUSE gallery site"
git remote add origin https://github.com/YOUR_USERNAME/koh-house.git
git branch -M main
git push -u origin main
```

Make sure the repository is **private** if you don't want your data files publicly readable.

---

## 2. Connect to Netlify

1. Go to [netlify.com](https://netlify.com) and log in (or create a free account).
2. Click **Add new site → Import an existing project**.
3. Choose **GitHub** and authorise Netlify to access your repositories.
4. Select the `koh-house` repository.
5. Netlify will detect the `netlify.toml` automatically. Leave build settings as detected.
6. Click **Deploy site**.

Your site will be live at a URL like `https://random-name.netlify.app`. You can set a custom domain later under **Domain settings**.

---

## 3. Setting Environment Variables in Netlify

1. In your Netlify site dashboard, go to **Site configuration → Environment variables**.
2. Click **Add a variable** for each of the following (refer to `.env.example` for descriptions):

| Variable | Notes |
|---|---|
| `GITHUB_TOKEN` | Personal Access Token (see §5) |
| `GITHUB_OWNER` | Your GitHub username or organisation |
| `GITHUB_REPO` | Repository name, e.g. `koh-house` |
| `ADMIN_EMAIL` | Email to log into the admin panel |
| `ADMIN_PASSWORD_HASH` | SHA-256 hash of your password (see §4) |
| `SESSION_SECRET` | Random 48-byte hex string |
| `STRIPE_SECRET_KEY` | From Stripe Dashboard (see §6) |
| `STRIPE_PUBLISHABLE_KEY` | From Stripe Dashboard (see §6) |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Webhook setup (see §7) |
| `SITE_URL` | Your full Netlify URL, e.g. `https://kohhouse.netlify.app` |

3. After adding all variables, trigger a **redeploy** under **Deploys → Trigger deploy → Deploy site**.

---

## 4. Generating a SHA-256 Password Hash

Your admin password is stored as a SHA-256 hash — never in plain text.

**Using Node.js (recommended):**

```bash
node -e "
  const crypto = require('crypto');
  const password = 'YourChosenPassword123!';
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  console.log(hash);
"
```

Copy the output and paste it as the value of `ADMIN_PASSWORD_HASH` in Netlify.

**Using an online tool (quick option):**
Visit [emn178.github.io/online-tools/sha256.html](https://emn178.github.io/online-tools/sha256.html), enter your password, and copy the hash. Use a strong, unique password.

---

## 5. Creating a GitHub Personal Access Token

The Netlify Functions use the GitHub API to read and write your `data/` JSON files (artworks, artists, homepage, settings). You need a token with write access to the repository.

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Give it a descriptive name, e.g. `KOH HOUSE Netlify Functions`.
4. Set an expiry (90 days recommended; you'll need to rotate it when it expires).
5. Under **Scopes**, tick **repo** (the top-level checkbox, which grants full repository access).
6. Click **Generate token** and copy it immediately — you won't see it again.
7. Paste it as the value of `GITHUB_TOKEN` in Netlify environment variables.

---

## 6. Stripe Account Setup and API Keys

1. Create a free account at [stripe.com](https://stripe.com) if you don't have one.
2. Complete identity verification to enable live payments.
3. Go to **Developers → API keys** in the Stripe Dashboard.
4. In **test mode**, copy:
   - **Publishable key** (starts with `pk_test_`) → `STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (starts with `sk_test_`) → `STRIPE_SECRET_KEY`
5. When you're ready for live payments, switch to **live mode** and copy the live keys (see §9).

---

## 7. Setting Up the Stripe Webhook

The webhook notifies your site when a payment is successfully completed, so the order can be processed.

1. In the Stripe Dashboard, go to **Developers → Webhooks**.
2. Click **Add endpoint**.
3. Set the **Endpoint URL** to:
   ```
   https://YOUR-SITE-URL.netlify.app/.netlify/functions/stripe-webhook
   ```
4. Under **Select events**, choose:
   - `checkout.session.completed`
   - `payment_intent.payment_failed` (optional, for logging)
5. Click **Add endpoint**.
6. On the webhook detail page, click **Reveal** under **Signing secret**.
7. Copy the value (starts with `whsec_`) → `STRIPE_WEBHOOK_SECRET` in Netlify.

---

## 8. First Login Credentials

Once all environment variables are set and the site is redeployed:

1. Go to `https://your-site-url.netlify.app/admin`
2. Log in with:
   - **Email:** the value you set for `ADMIN_EMAIL`
   - **Password:** the plain-text password you hashed for `ADMIN_PASSWORD_HASH`

You will be taken to the admin dashboard where you can manage artworks, artists, and site content.

---

## 9. Switching from Stripe Test Mode to Live Mode

When you're ready to accept real payments:

1. In the Stripe Dashboard, toggle from **Test mode** to **Live mode** (top-right switch).
2. Go to **Developers → API keys** and copy the **live** publishable and secret keys.
3. In Netlify, update:
   - `STRIPE_PUBLISHABLE_KEY` → live publishable key (`pk_live_...`)
   - `STRIPE_SECRET_KEY` → live secret key (`sk_live_...`)
4. Create a **new webhook endpoint** in live mode (repeat §7 steps) and update `STRIPE_WEBHOOK_SECRET` with the new signing secret.
5. Trigger a redeploy in Netlify.

> **Note:** Test transactions do not charge real cards. Always verify your checkout flow thoroughly in test mode before switching to live.

---

## 10. Local Development with `netlify dev`

You can run the full site locally — including Netlify Functions — using the Netlify CLI.

**Install the Netlify CLI:**

```bash
npm install -g netlify-cli
```

**Create a local `.env` file:**

```bash
cp .env.example .env
# Open .env and fill in all values
```

**Link to your Netlify site (first time only):**

```bash
netlify link
```

**Start the local dev server:**

```bash
netlify dev
```

This starts a local server at `http://localhost:8888` that serves your site and proxies all `/.netlify/functions/*` calls to locally-running function code. Changes to functions are hot-reloaded automatically.

**Useful commands:**

```bash
# Run a specific function manually
netlify functions:invoke get-data --payload '{"file":"artworks"}'

# Check your linked site status
netlify status

# View function logs
netlify functions:list
```

---

## Troubleshooting

**Admin login not working:**
- Confirm `ADMIN_PASSWORD_HASH` matches a SHA-256 hash of your password (not the password itself).
- Ensure there are no trailing spaces in environment variable values.
- Trigger a fresh redeploy after changing variables.

**Functions returning 500 errors:**
- Check the function logs in Netlify Dashboard → Functions → select the function.
- Confirm `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` are all set correctly.
- Ensure the token has `repo` scope and hasn't expired.

**Stripe payments failing:**
- Confirm you're using test keys in test mode and live keys in live mode (they cannot be mixed).
- Check that `STRIPE_WEBHOOK_SECRET` matches the signing secret for the active endpoint.
- In the Stripe Dashboard, inspect the webhook event log for delivery errors.
