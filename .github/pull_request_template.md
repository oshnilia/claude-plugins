## What and why

<!-- One or two sentences. Link the issue: "Closes #12". Larger changes need an issue first. -->

## Checklist

- [ ] `claude plugin validate .` and `claude plugin validate plugins/<name>` pass
- [ ] Mod change: `claude plugin test plugins/session-board` passes, and a test covers the change
- [ ] Skill change in legible: `claude plugin eval plugins/legible --no-publish` before and after, the table is below
- [ ] `version` in the plugin's `plugin.json` is raised, and `CHANGELOG.md` has a line
- [ ] No new dependencies, network calls, or commands run on the user's machine (or the PR says why, in bold)
- [ ] No secrets, personal paths, email addresses, or private transcripts in files, tests or screenshots
- [ ] Nothing claims ASD-STE100 compliance, and no STE dictionary text is added

## How you checked it

<!-- Commands and their output, or screenshots of the board on desktop and in the terminal. -->
