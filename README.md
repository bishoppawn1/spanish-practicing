# ¡Hola! — Spanish Practicing

**[Open the app on GitHub Pages](https://bishoppawn1.github.io/spanish-practicing/)**

A text-only learning app for Spanish greetings, introductions, calendar vocabulary, and weather. Includes all 98 cards from [Spanish Greetings and Introductions Wes](https://quizlet.com/1203332246/spanish-greetings-and-introductions-wes-flash-cards/) by Maritza_Wesberry. No flashcard images, accounts, backend, or API keys.

## Practice

- Click **Start practicing** for shuffled multiple-choice questions.
- Sessions mix English → Spanish and Spanish → English questions by default, initially alternating languages with a random starting language; skipped questions may change that order. You can also select a single direction. Choose 10, 20, or all 98 questions.
- Select an answer, then press **Confirm answer**. You can change your selection before confirming. Correct answers display a large green **Correct!** banner.
- Track **correct out of answered**. Each question counts only once.
- The **Skipped** counter records each skip during the session, including skipping the same question again. It stays separate from the score and resets with a new session.
- **Hint** removes two wrong choices, without counting an answer.
- **Skip** leaves the score and answered count unchanged. After you continue, the question returns at a random position among the remaining questions. It will not repeat immediately unless it is the only unanswered question left. A session finishes only after every question has a confirmed answer. After a wrong answer or skip, the correct answer stays hidden until you choose **Show correct answer**. The adjacent **Continue to next question** button lets you move on without revealing it.
- Review your results and practice only missed terms in a fresh session.
- Browse or search all 98 terms in Vocabulary. Switching tabs preserves the session; returning to setup or reloading starts fresh.
- Use keys **1–4** to select an answer, or Tab and Enter to navigate. There is no timer.

## Development

Use Node.js 22+ for tests/build and Python 3 for the preview server. No npm dependencies need to be installed.

```sh
npm run dev
```

Open http://127.0.0.1:5173. JavaScript modules require HTTP instead of opening `index.html` directly.

```sh
npm test
npm run build
```

`dist/` contains only publishable static files. Relative paths support the GitHub Pages project URL. Google Fonts supplies typography with local sans-serif fallbacks; all learning content and app logic are bundled locally.

## GitHub Pages

The workflow tests, builds, and deploys pushes to `main`. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** once. Then run **Test and deploy GitHub Pages** from Actions, or push a commit. The app is published at:

https://bishoppawn1.github.io/spanish-practicing/

## Vocabulary source notes

All 98 source entries are included, including synonymous cards. Images are intentionally omitted. Accents, capitalization, spacing, apostrophes, and ellipses were lightly standardized (for example, `Perdón`, `mío`, `Quién`, `días`, and `frío`). The source's `el profesor / el maestro` translation was corrected from “teacher (male/female)” to “teacher (male).” Equivalent or overlapping translations are excluded from each other's distractor choices to avoid ambiguous questions.

Edit vocabulary and equivalence groups in `src/cards.js`. Keep the source link and notes up to date. Agent workflow and push requirements are in [AGENTS.md](./AGENTS.md).
