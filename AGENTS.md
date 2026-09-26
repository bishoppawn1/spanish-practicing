# Spanish Practicing — agent instructions

## Project

A text-only Spanish vocabulary app using all 98 cards in the README's Quizlet set. Runs entirely in the browser and is hosted at https://bishoppawn1.github.io/spanish-practicing/.

## Rules for every agent

- Read this file and README before editing.
- Preserve Start practicing, four-choice questions, immediate feedback, hints, skipping, and the correct-out-of-answered score. Count each question only once. Skips count as missed; hints do not count as answers.
- After a wrong answer or skip, keep the correct answer hidden. Show an optional **Show correct answer** button beside **Continue to next question**; revealing must not change the score.
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
