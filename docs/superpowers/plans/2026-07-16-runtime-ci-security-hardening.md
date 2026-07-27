# Runtime, Container, and CI Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Gathr to a supported Node runtime and make dependency, migration, secret, source, container, and deployment checks deterministic and blocking.

**Architecture:** Keep the existing npm workspaces and two-image Compose topology. Tighten build contexts and runtime users, bake an exact Supabase CSP into the web image, and extend the single CI workflow with least-privilege jobs that consume the database regression harness.

**Tech Stack:** Node.js 24 LTS, npm workspaces, Docker/Compose, nginx, GitHub Actions, CodeQL 4, Trivy 0.36, Supabase CLI 2.109.1.

## Global Constraints

- Complete the database plan before enabling its CI job; the job consumes `supabase/config.toml` and `supabase/tests/apply-all.sql`.
- Preserve frontend/color work; CSP and package metadata changes must not alter rendered design.
- Commit no `.env` file or secret; only `.env.example` files are allowed.
- Use `npm ci` exclusively in CI and images.
- Run the API image as a non-root user.
- Pin GitHub Actions to full immutable commit SHAs with a release comment.
- Keep the current optional credentialed E2E job optional; all new security jobs are blocking.

---

### Task 1: Upgrade the supported runtime and lock the Supabase test tool

**Files:**
- Modify: `package.json`
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`
- Modify: `.github/dependabot.yml`
- Test: `package-lock.json`

**Interfaces:**
- Produces: Node engine floor `>=24` and exact dev tool `supabase@2.109.1`.
- Consumed by: all later tasks and both other implementation plans.

- [ ] **Step 1: Change package metadata through npm**

Run:

```bash
npm pkg set engines.node=">=24"
npm pkg set devDependencies.supabase="2.109.1"
npm pkg set devDependencies.@types/node="^24.0.0" --workspace=apps/api
npm pkg set devDependencies.@types/node="^24.0.0" --workspace=apps/web
npm install --package-lock-only
```

Do not overwrite unrelated package keys already present in the worktree.

- [ ] **Step 2: Verify the lock under Node 24**

Run:

```bash
node --version
npm ci
npm run build:all
npm run test:ci
npm audit --audit-level=high
```

Expected: Node reports v24.x; install, builds, tests, and audit exit zero.

- [ ] **Step 3: Let Dependabot maintain pinned actions**

Ensure `.github/dependabot.yml` has both npm and `github-actions` ecosystems on a weekly schedule. Keep its existing npm configuration rather than duplicating it.

- [ ] **Step 4: Commit**

```bash
git add package.json apps/api/package.json apps/web/package.json package-lock.json .github/dependabot.yml
git commit -m "build: move workspaces to Node 24"
```

---

### Task 2: Exclude secrets and minimize the API container

**Files:**
- Create: `.dockerignore`
- Modify: `apps/api/Dockerfile`
- Modify: `apps/web/Dockerfile`
- Modify: `docker-compose.yml`
- Create: `.env.example`
- Test: `apps/api/Dockerfile`
- Test: `apps/web/Dockerfile`

**Interfaces:**
- Consumes Compose variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_WS_URL`, `CORS_ORIGIN`, `WEB_ORIGIN`.
- Produces images: `gathr-api:ci`, `gathr-web:ci`.

- [ ] **Step 1: Add the build-context denylist**

Create `.dockerignore` with these exact classes:

```dockerignore
.git
.github
.agents
.codex
**/.env
**/.env.*
!**/.env.example
**/node_modules
**/dist
**/coverage
**/test-results
**/playwright-report
*.log
npm-debug.log*
docs
e2e
```

- [ ] **Step 2: Write the deterministic API Dockerfile**

Use one full build stage and one production-dependency stage:

```dockerfile
FROM node:24-alpine AS manifests
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

FROM manifests AS build
RUN npm ci
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN npm run build --workspace=apps/api

FROM manifests AS production-dependencies
RUN npm ci --omit=dev --workspace=@gathr/api --include-workspace-root=false

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./dist
COPY --from=build --chown=node:node /app/apps/api/package.json ./package.json
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3001/api/health >/dev/null || exit 1
CMD ["node", "dist/index.js"]
```

The runtime receives neither source, compiler, root package scripts, nor development dependencies.

- [ ] **Step 3: Make the web build strict and CSP-aware**

Use Node 24, strict `npm ci`, and four mandatory build arguments:

```dockerfile
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG SUPABASE_URL
ARG SUPABASE_WS_URL

FROM node:24-alpine AS build
WORKDIR /app
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY"
RUN npm run build --workspace=apps/web

FROM nginx:alpine AS runtime
ARG SUPABASE_URL
ARG SUPABASE_WS_URL
COPY apps/web/nginx.conf /tmp/default.conf
RUN test -n "$SUPABASE_URL" && test -n "$SUPABASE_WS_URL" \
 && sed -e "s|__SUPABASE_URL__|$SUPABASE_URL|g" \
        -e "s|__SUPABASE_WS_URL__|$SUPABASE_WS_URL|g" \
        /tmp/default.conf > /etc/nginx/conf.d/default.conf \
 && rm /tmp/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 4: Supply all Compose values explicitly**

Web build args use `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_WS_URL`. API environment adds the missing anon key, JWT secret, `WEB_ORIGIN`, and `TRUST_PROXY_HOPS=0`. The local host port remains published for development, with proxy trust disabled.

Create a root `.env.example` containing only documented example values and safe localhost defaults. Never add a root `.env`.

- [ ] **Step 5: Build and inspect**

Run:

```bash
docker build -f apps/api/Dockerfile -t gathr-api:ci .
docker build -f apps/web/Dockerfile -t gathr-web:ci --build-arg VITE_SUPABASE_URL=https://example.invalid --build-arg VITE_SUPABASE_ANON_KEY=test-public-key --build-arg SUPABASE_URL=https://example.invalid --build-arg SUPABASE_WS_URL=wss://example.invalid .
docker run --rm gathr-api:ci sh -c "test $(id -u) -ne 0 && test ! -e /app/apps/api/.env && test ! -e /app/apps/api/src"
```

Expected: both builds succeed and the runtime inspection exits zero.

- [ ] **Step 6: Commit**

```bash
git add .dockerignore .env.example apps/api/Dockerfile apps/web/Dockerfile docker-compose.yml
git commit -m "build: harden application containers"
```

---

### Task 3: Restrict the production CSP to the configured Supabase project

**Files:**
- Modify: `apps/web/nginx.conf`
- Test: `apps/web/nginx.conf`

- [ ] **Step 1: Replace the wildcard CSP source**

The final header is:

```nginx
add_header Content-Security-Policy "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' __SUPABASE_URL__ __SUPABASE_WS_URL__; font-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none';" always;
```

No `*.supabase.co` wildcard remains.

- [ ] **Step 2: Verify the baked config**

Run the web build command from Task 2, then:

```bash
docker run --rm gathr-web:ci nginx -T
```

Expected: output contains `https://example.invalid wss://example.invalid`, contains no unreplaced `__SUPABASE_` token, and contains no `*.supabase.co`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/nginx.conf
git commit -m "fix: restrict web connection policy"
```

---

### Task 4: Make security and database checks blocking in CI

**Files:**
- Modify: `.github/workflows/ci.yml`
- Test: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: database plan's local Supabase files.
- Uses immutable actions:
  - `actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10` (`v6`)
  - `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` (`v6.4.0`)
  - `github/codeql-action/*@7fc6561ed893d15cec696e062df840b21db27eb0` (`v4.35.2`)
  - `aquasecurity/trivy-action@a9c7b0f06e461e9d4b4d1711f154ee024b8d7ab8` (`v0.36.0`)

- [ ] **Step 1: Pin existing jobs and declare default permissions**

Add top-level:

```yaml
permissions:
  contents: read
```

Replace every checkout/setup-node tag with the SHAs above, add release comments, and set every Node version to `'24'`. Keep `npm ci` and remove no existing build/test gate.

- [ ] **Step 2: Add the database-security job**

The job runs on Ubuntu, checks out, sets up Node 24, installs with `npm ci`, starts local Supabase, runs:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/apply-all.sql
```

and executes `npm exec supabase stop` under `if: always()`. It has no production secrets.

- [ ] **Step 3: Add CodeQL**

Create a `codeql` job with job permissions `contents: read`, `security-events: write`, and `packages: read`. Use `init` with `languages: javascript-typescript` and `build-mode: none`, then `analyze`, both pinned to `7fc6561ed893d15cec696e062df840b21db27eb0`.

- [ ] **Step 4: Add Trivy repository and image gates**

Add a repository scan before container builds:

```yaml
- uses: aquasecurity/trivy-action@a9c7b0f06e461e9d4b4d1711f154ee024b8d7ab8 # v0.36.0
  with:
    scan-type: fs
    scan-ref: .
    scanners: vuln,secret,misconfig
    severity: HIGH,CRITICAL
    ignore-unfixed: true
    exit-code: '1'
```

After each Docker image build, run the same pinned action with `image-ref`, `scanners: vuln,secret,misconfig`, HIGH/CRITICAL severity, and exit code 1.

- [ ] **Step 5: Supply non-secret web build arguments in CI**

The CI web image command uses the exact dummy values from Task 2 so mandatory CSP/build args are tested without real credentials.

- [ ] **Step 6: Validate workflow structure and commit**

Run:

```bash
rg -n "uses:.*@(v|main|master|latest)" .github/workflows
rg -n "node-version:.*20|npm install|continue-on-error: true" .github/workflows/ci.yml
```

Expected: the first command finds no movable action reference; the second finds only the intentionally optional credentialed E2E job's `continue-on-error`.

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add blocking security gates"
```

---

### Task 5: Publish deployment invariants and final verification

**Files:**
- Modify: `docs/ops.md`
- Modify: `docs/release-checklist.md`
- Modify: `docs/getting-started.md`
- Test: repository-wide checks

- [ ] **Step 1: Update operations documentation**

Document Node 24, exact `WEB_ORIGIN`, `SUPABASE_WS_URL`, proxy trust default 0, secure-cookie behavior, non-root image, local Supabase test command, exact-project CSP, and the shared-rate-limit-store prerequisite before a second API replica.

- [ ] **Step 2: Update branch protection requirements**

Require these checks before merge: web, api, docker, audit, database-security, codeql, and repository-security. Keep E2E optional until dedicated test-project secrets exist.

- [ ] **Step 3: Run all repository gates**

```bash
npm ci
npm run lint
npm run build:all
npm run test:ci
npm audit --audit-level=high
npm exec supabase start
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/apply-all.sql
npm exec supabase stop
docker compose --env-file .env.example config
docker compose --env-file .env.example build
```

Expected: every command exits zero. If local Docker is unavailable, run all non-Docker checks locally and require the blocking CI Docker/database jobs before claiming those gates pass.

- [ ] **Step 4: Verify no secret or movable reference is tracked**

```bash
git ls-files | rg "(^|/)\.env($|\.)" | rg -v "\.env\.example$"
rg -n "uses:.*@(v|main|master|latest)|https://\*\.supabase\.co|FROM node:20|npm ci \|\| npm install" .github apps docker-compose.yml
```

Expected: both commands produce no output.

- [ ] **Step 5: Commit documentation and final test corrections**

```bash
git add docs/ops.md docs/release-checklist.md docs/getting-started.md
git commit -m "docs: publish security deployment gates"
```
