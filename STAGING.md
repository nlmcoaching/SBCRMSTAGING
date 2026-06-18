# Simply Breathe CRM — Staging Environment

Staging URL: **https://sbcrm-staging.simplybreathe.ai**

| | Production | Staging |
|---|---|---|
| GitHub repo | [nlmcoaching/SBCRM](https://github.com/nlmcoaching/SBCRM) | [nlmcoaching/SBCRMSTAGING](https://github.com/nlmcoaching/SBCRMSTAGING) |
| Git remote | `origin` | `staging` |
| Backend port | `3001` | `3002` |
| App directory (example) | `/var/www/sbcrm` | `/var/www/sbcrm-staging` |

---

## Workflow

Develop and test on staging first, then promote to production.

```bash
# Day-to-day: push changes to staging
git push staging master

# After staging looks good: promote to production
git push origin master
```

On the VPS, pull and redeploy each environment separately (see [Deploy updates](#deploy-updates) below).

---

## Git remotes (local machine)

If not already configured:

```bash
git remote add staging https://github.com/nlmcoaching/SBCRMSTAGING.git
git branch --set-upstream-to=origin/master master   # keep production as default upstream
```

---

## First-time VPS setup

These steps mirror production on the **same server**, using a separate subdomain, port, directory, and secrets.

### 1. DNS

Add an A record (or CNAME) pointing `sbcrm-staging.simplybreathe.ai` to the production server IP.

### 2. Clone the staging repo

```bash
sudo mkdir -p /var/www/sbcrm-staging
sudo chown $USER:$USER /var/www/sbcrm-staging
git clone https://github.com/nlmcoaching/SBCRMSTAGING.git /var/www/sbcrm-staging
cd /var/www/sbcrm-staging
```

### 3. Backend environment

```bash
cp backend/.env.staging.example backend/.env
# Edit backend/.env — generate fresh secrets for staging (never reuse production values)
nano backend/.env
```

Required staging values:

| Variable | Staging notes |
|---|---|
| `PORT` | `3002` |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGINS` | `https://sbcrm-staging.simplybreathe.ai` |
| `CALENDLY_WEBHOOK_SIGNING_KEY` | From a **separate** Calendly webhook subscription (see below) |
| `QUEUE_ENCRYPTION_KEY` | New key: `openssl rand -hex 32` |
| `FRONTEND_SECRET` | New key: `openssl rand -hex 32` |
| `ADMIN_SECRET` | New key: `openssl rand -hex 32` |
| `CALENDLY_API_TOKEN` | Can share with production or use a staging token |
| `RESEND_API_KEY` | Same Resend account; emails are **real** (see Resend notes) |
| `RESEND_FROM` | Verified sender, e.g. `jeff@simplybreathe.ai` |

### 4. Calendly webhook (staging only)

In Calendly → Integrations → Webhooks, create a **new** subscription:

- **URL:** `https://sbcrm-staging.simplybreathe.ai/api/webhooks/calendly`
- **Events:** `invitee.created`, `invitee.canceled`, `invitee_no_show.created`, `invitee_no_show.deleted`
- Copy the **Signing Key** into staging `backend/.env` as `CALENDLY_WEBHOOK_SIGNING_KEY`

Do not point the production webhook at staging.

### 5. Build frontend

```bash
cd /var/www/sbcrm-staging
npm install
npm run build

cd backend
npm install --production
```

### 6. Systemd service

```bash
sudo cp deploy/sbcrm-staging.service.example /etc/systemd/system/sbcrm-staging.service
# Edit User/Group and paths if your server layout differs
sudo systemctl daemon-reload
sudo systemctl enable sbcrm-staging
sudo systemctl start sbcrm-staging
sudo systemctl status sbcrm-staging
```

### 7. Nginx

```bash
sudo cp deploy/nginx-staging.conf.example /etc/nginx/sites-available/sbcrm-staging
sudo ln -s /etc/nginx/sites-available/sbcrm-staging /etc/nginx/sites-enabled/
# Set FRONTEND_SECRET in the proxy_set_header line to match backend/.env
sudo nginx -t && sudo systemctl reload nginx
```

Obtain TLS certificate:

```bash
sudo certbot --nginx -d sbcrm-staging.simplybreathe.ai
```

### 8. Verify

- `https://sbcrm-staging.simplybreathe.ai` loads the app
- `https://sbcrm-staging.simplybreathe.ai/health` returns OK (proxied to backend)
- Log in and complete first-time setup (PIN + user account)

---

## Seed data on staging

Staging uses the **same built-in demo seed** as a fresh production install (see DOCUMENTATION.md → Seed Data). Data is stored in browser `localStorage` on the staging subdomain, so it is fully isolated from production.

On first login to staging:

1. Create your Owner account and PIN (same process as production first run).
2. The app loads the pre-populated sample records automatically.

To mirror a **live production snapshot** instead:

1. On production: Admin → Export Backup (Owner only) → save the JSON file securely.
2. Staging has no one-click restore UI yet — contact the dev team or use a controlled manual import if needed.

---

## Resend (real emails from staging)

Staging sends **real emails** via Resend. To avoid confusing clients:

- Test with internal email addresses where possible.
- Consider prefixing subjects in templates during staging tests, e.g. `[STAGING]`.
- Staging and production share the same Resend domain verification; use the same `RESEND_FROM` if already verified.

---

## Deploy updates

### Staging

```bash
cd /var/www/sbcrm-staging
git pull origin master
npm install && npm run build
cd backend && npm install --production
sudo systemctl restart sbcrm-staging
```

### Production (after promote)

```bash
cd /var/www/sbcrm          # your production path
git pull origin master
npm install && npm run build
cd backend && npm install --production
sudo systemctl restart sbcrm   # your production service name
```

---

## Checklist

- [ ] DNS: `sbcrm-staging.simplybreathe.ai` → server IP
- [ ] Repo cloned to `/var/www/sbcrm-staging`
- [ ] `backend/.env` filled with **staging-only** secrets
- [ ] Separate Calendly webhook → staging URL
- [ ] Frontend built (`dist/`)
- [ ] `sbcrm-staging` systemd service running on port 3002
- [ ] Nginx configured with `x-frontend-secret` header injection
- [ ] TLS certificate installed
- [ ] First login + seed data verified
- [ ] Test Calendly sync and a test email send
