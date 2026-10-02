---
name: deploy-presentation
description: Use when deploying or publishing learn-with-ai, preparing its release notes or release version, or responding to 배포해줘. Updates the repository release record before GitHub Pages deployment.
---

# Presentation deployment

Work from this repository's root. Keep the existing `site/`-only Pages deployment and inherited domain. Do not create `site/CNAME`.

## Prepare the release

1. Inspect `git status`, configured remotes, `.github/workflows/pages.yml`, and `RELEASE_NOTES.md`. Fetch each configured remote. Reconcile remote changes without force-pushing.
2. Review the changes since the last release: `git log -1 --format=%H -- site/release.js` identifies the last release metadata commit. Inspect both commits since that point and pending changes. If no release exists, describe this initial version from the actual changes.
3. Write a short Korean list of user-visible changes (`- ` bullets) to a temporary file **outside the repository**. Include relevant deployment changes, not a list of every file. Do not claim a deployment has succeeded yet.
4. Finish source, docs, and skill changes first, then run:

   ```sh
   node scripts/release.mjs prepare --notes-file /absolute/path/to/summary.txt
   node --check site/app.js
   node --check site/content.js
   node --test scripts/release.test.mjs
   node scripts/check.mjs
   git diff --check
   ```

   Use Node.js 22, matching CI. `prepare` generates `RELEASE_NOTES.md` and `site/release.js` together. It chooses `YYYYMMDD+N` using Asia/Seoul; N starts at 1 each day. Repeating preparation before committing replaces the draft at the same version. Once committed, a subsequent preparation allocates the next version, including a redeployment with no source changes. Explain the redeployment in its notes. Do not pass `--date` during normal deployment; it exists for deterministic tests and historical recovery.
5. Inspect the notes and preview the version in a slide. Run `node scripts/release.mjs install-hooks` when the repository hook is not installed. Existing unrelated hooks must be integrated, never overwritten.
6. Split substantial changes into logical commits. Include the generated notes and version in the final release commit. Source changes after preparation require another `prepare` and validation. Run `node scripts/release.mjs check --ref HEAD --deployment` on the final commit; the hook validates the actual pushed commit, not the working directory. Do not bypass a failed hook.

## Deploy and verify

When the user has requested deployment, push `main` to **every configured remote** and verify each remote ref matches local HEAD. A request merely to set up or edit the release tooling does not request a deployment.

Watch the `Publish presentation` workflow for the exact pushed SHA. CI validates the source snapshot and records successful deployment as `release-YYYYMMDD+N`. A failed workflow may be retried with the same version only when it has not already been tagged as successfully deployed. A new successful redeployment needs a newly prepared version. `workflow_dispatch` also enforces this rule and only deploys `main`.

After success, fetch tags, verify the version tag points to the deployed SHA, and compare the public `https://roboco.io/learn-with-ai/release.js` with the committed file. Verify updated public assets as appropriate. Report the public URL and version. If CI or public verification fails, report that failure rather than claiming success. Never edit past release entries to describe a new deployment.
