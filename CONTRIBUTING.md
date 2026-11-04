# Contributing

1. Open an issue first, so we can agree on the change.
2. Branch from `main` and keep pull requests small.
3. Run the checks for what you touched. CI runs the same ones.

   ```bash
   cd contracts && cargo test
   cd frontend && npm ci && npm run typecheck && npm test && npm run build
   ```

4. Touched money? Add a test that fails without your change. Every rule in [the threat model](docs/THREAT-MODEL.md) names its test, so a new rule needs a new row too.
5. Touched a screen? Check it at 360 px wide, and keep these rules:
   - all on-screen text lives in `frontend/src/copy.ts`, in plain Indonesian, without chain jargon;
   - all colours and fonts live in `frontend/src/theme.css`;
   - `frontend/src/hygiene.test.ts` enforces both.
6. Never commit keys or seed phrases (see [SECURITY.md](SECURITY.md)).

The contract is deployed with no access keys, so a contract change means a new deployment and a new address. Say so in the pull request.
