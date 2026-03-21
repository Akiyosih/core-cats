# shared/public-site

Shared browse-only UI and data helpers for the Core Cats public surfaces.

## Purpose
This workspace holds the public browse layer used by both:

1. `web/`
   - the Vercel-hosted mint application
   - also serves browse routes as thin wrappers or fallbacks when needed
2. `web-public-teaser/`
   - the Cloudflare-hosted browse-only public surface

## What Lives Here
1. shared public-page components
2. shared site chrome
3. shared browse CSS
4. shared viewer-data helpers
5. shared public-status snapshot client logic

## What Does Not Live Here
1. mint session logic
2. CorePass callback handling
3. backend proxy code
4. deploy-specific runtime secrets

## Intent
The goal is to keep public browse behavior implemented once while allowing:

1. `web/` to remain the mint-focused application
2. `web-public-teaser/` to remain the browse-focused static/public application
