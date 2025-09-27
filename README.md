# Nesheim & Vatten — Shopify Theme (Starter)

This repo is a clean starter you can open in **GitHub Codespaces** (“Codex”) to work on your Shopify theme with a fully configured dev environment.

## Quick Start (Codespaces)
1. Click **Use this template → Create a new repository** on GitHub, then **Code → Create codespace on main**.
2. When the Codespace opens, run:
   ```bash
   cp .env.example .env
   # Fill in credentials (see below), then:
   npm run setup
   npm run dev
   ```
3. Visit the preview URL printed by `shopify theme dev` to see your theme live.

## Import existing theme code
If you already have the theme files (e.g. exported ZIP from Dawn copy), add them:
```bash
# In repo root, drag/drop or upload files, or:
unzip /workspaces/<codespace>/uploads/your-theme.zip -d ./
git add . && git commit -m "Import theme"
git push origin main
```
> Keep the structure with `layout/`, `sections/`, `templates/`, `snippets/`, `assets/` at repo root.

## Environment
Duplicate `.env.example` → `.env` and fill:
```
SHOPIFY_FLAG_STORE=<your-store>.myshopify.com
SHOPIFY_CLI_AUTH_TOKEN=<admin API access token>
THEME_ID=<optional, for deploy to existing theme>
```
- Create an **Admin API access token**: Shopify Admin → **Apps** → **Develop apps** → Create app → **Configure Admin API scopes** (Theme access) → **Install app** → **Reveal token**.
- In Codespaces: **Repository → Settings → Secrets and variables → Codespaces**: add `SHOPIFY_FLAG_STORE`, `SHOPIFY_CLI_AUTH_TOKEN`, `THEME_ID` (optional).

## Scripts
```bash
npm run setup   # installs Ruby gems + npm deps, sets up shopify-cli
npm run dev     # runs `shopify theme dev` with your .env
npm run check   # runs theme-check (lint)
npm run deploy  # pushes theme to Shopify (creates new or updates THEME_ID if set)
```

## CI
A GitHub Action runs **theme-check** on every PR. Add more checks as needed.

## Branching
- `main` is protected; use feature branches and PRs.
- Tag releases for stable deployments (e.g., `v0.1.0`).

## Conventions
- Keep liquid assets small; use CDN for large media.
- Put custom JS/CSS into `assets/` (`theme.custom.js`, `theme.custom.css`).
- Group section schemas clearly and document blocks/options inline.

---

© Nesheim & Vatten. MIT for starter scaffolding; your theme code license is your choice.
