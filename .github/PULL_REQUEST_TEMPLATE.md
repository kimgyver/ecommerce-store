## PR checklist ✅

- [ ] Tests pass locally (`pnpm test -- --run`).
- [ ] Coverage generated locally (`pnpm run coverage`) and added/updated if applicable.
- [ ] CI checks (tests + coverage upload) pass on the branch.
- [ ] If this PR changes behavior, update relevant tests and README docs.
- [ ] Add a short description of the change and why it was needed.

Notes for maintainers:

- CI uploads coverage to Codecov if `CODECOV_TOKEN` is present in repository secrets.
- If Codecov upload fails, check the `Upload to Codecov` step and ensure the secret exists.
