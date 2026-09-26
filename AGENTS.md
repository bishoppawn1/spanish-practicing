# Spanish Practicing — agent instructions

## Project

A text-only Spanish vocabulary app using all 98 cards in the README's Quizlet set. Runs entirely in the browser and is hosted at https://bishoppawn1.github.io/spanish-practicing/.

## Rules for every agent

- Read this file and README before editing.
- Preserve Start practicing, four-choice questions, immediate feedback, hints, skipping, and the correct-out-of-answered score. Count each question only once. Skipped questions return to the remaining random pool and never affect correct, answered, or missed counts. Only confirmed answers count. Track total skip actions in a separate Skipped counter, including repeat skips; reset it for each new session. Hints do not count as answers.
- Keep **Show correct answer** available before a response in both practice modes, as a separate control. Revealing must not change the score or prevent the learner from answering. After a wrong answer or skip, also show **Show correct answer** beside **Continue to next question**; keep the answer hidden unless the learner reveals it.
- Use a dark theme and a large, readable question area. Selecting an option must not submit it: require **Confirm answer**. Announce correct answers with a prominent factual banner and accessible status.
- Keep the interface factual and minimal: no motivational phrases, category badges, keyboard-tip copy, or footer links. Default to questions in both languages.
- Keep all 98 source cards available, without flashcard images. Document translation corrections.
- Keep equivalent meanings out of distractor choices.
- Maintain accessible keyboard controls, clear text feedback, and responsive layouts.
- Keep runtime code dependency-free, with no backend, API keys, or login. Use relative paths compatible with `/spanish-practicing/` on GitHub Pages.
- Run `npm test` and `npm run build` for application changes. Verify relevant UI flows in a browser.
- Keep the README's GitHub Pages link current. The production build versions asset URLs automatically. Until Pages uses only GitHub Actions, also bump the version query in `index.html` and local imports in `src/app.js` when changing those assets, so branch publishing cannot serve cached code.
- After completing and verifying a change, commit and push to GitHub. Push each completed task, not each individual file edit. Never push credentials, force-push, or overwrite someone else's changes. Report any push blocker.

## Files

- `src/cards.js`: vocabulary, categories, equivalent-meaning groups.
- `src/quiz.js`: question generation and scoring.
- `src/app.js`: rendering and interaction.
- `index.html`, `styles.css`: structure and responsive styling.
- `tests/quiz.test.js`: dataset and quiz behavior checks.
- `scripts/build.js`: static asset build to `dist/`.
- `.github/workflows/pages.yml`: tests and GitHub Pages deployment.
