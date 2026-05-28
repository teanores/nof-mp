# Local Agent Start

1. Read `README.md`.
2. Read `docs/architecture/platform-boundary.md`.
3. Inspect `.env.example`; never ask for or print real secrets unless a task explicitly needs a safe local integration step.
4. Run checks separately on Windows if combined `npm run check` hits npm wrapper access noise:

```powershell
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

5. Do not add tracker boards/wiki/product MCP methods here; those belong to `nof-tt`.
