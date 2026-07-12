# Contributing

## Branch Strategy

- `main` — production-ready code
- `dev` — active development
- Feature branches: `feat/your-feature-name`
- Bug fixes: `fix/bug-description`

## Development Workflow

1. Create a branch from `dev`
2. Make your changes in the relevant workspace
3. Run lint: `npm run lint`
4. Run tests: `npm run test:ci`
5. Build: `npm run build`
6. Test locally: `npm run dev`
7. Open a pull request to `dev` (or `main` for a prod hotfix)

## CI & Branch Protection

CI (`.github/workflows/ci.yml`) runs lint + build + vitest on every PR to
`main`. Configure branch protection in GitHub → Settings → Branches so the `web`
+ `api` + `docker` checks are **required** before merge to `main`, PR reviews are
required, and force-push is forbidden. See `docs/ops.md` for the full release
runbook.

## Code Style

- **ESLint** is configured for the web app — run `npm run lint` before committing
- Use **functional components** with hooks (no class components)
- Keep components small and focused
- Use React Context for shared state (see `apps/web/src/context/`)

## Adding Shared Code

If you find code duplicated across apps, extract it to `packages/shared`:

1. Add the module to `packages/shared/src/`
2. Export it from `packages/shared/src/index.js`
3. Import in your app: `import { util } from '@gathr/shared'`

## Commit Messages

Use conventional commits:

```
feat: add venue search filters
fix: correct booking date validation
docs: update API reference
chore: upgrade vite to v6.1
```
