import { cards } from "./cards.js";
import {
  createSession,
  answerQuestion,
  advanceQuestion,
  useHint,
} from "./quiz.js";

const main = document.querySelector("#main");
const practiceTab = document.querySelector("#practice-tab");
const vocabularyTab = document.querySelector("#vocabulary-tab");
let session = null;
let direction = "es-en";
let count = cards.length;
let screen = "home";
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const arrow = '<span aria-hidden="true">↗</span>';

function setScreen(name) {
  screen = name;
  const vocabulary = name === "vocabulary";
  practiceTab.classList.toggle("active", !vocabulary);
  vocabularyTab.classList.toggle("active", vocabulary);
  practiceTab.removeAttribute("aria-current");
  vocabularyTab.removeAttribute("aria-current");
  (vocabulary ? vocabularyTab : practiceTab).setAttribute(
    "aria-current",
    "page",
  );
}
function focusHeading() {
  main.querySelector("h1")?.focus();
}

function showHome() {
  setScreen("home");
  main.innerHTML = `
    <section class="welcome"><div><p class="eyebrow"><span class="tiny-star">✳</span> YOUR DAILY DOSE OF ESPAÑOL</p><h1 tabindex="-1">A little Spanish.<br><em>A world of conversation.</em></h1><p class="intro">From your first <span lang="es">hola</span> to everyday conversations.<br>Build your confidence, one question at a time.</p></div><div class="greeting-art" aria-hidden="true"><div class="speech speech-es">¡Hola!<span>IT STARTS WITH A HELLO</span></div><div class="speech speech-en">Hello to you, too. <span>↗</span></div><span class="art-spark">✳</span></div></section>
    <section class="home-grid" aria-label="Practice setup"><div class="setup-card"><div class="card-heading"><span class="eyebrow">YOUR PRACTICE SET</span><span class="pill">BEGINNER FRIENDLY</span></div><h2>Greetings & introductions</h2><p class="muted">The everyday words that open up a conversation.</p><div class="set-meta"><span><b>98</b> terms to explore</span><span class="meta-dot">·</span><span>4 answer choices</span><span class="meta-dot">·</span><span>At your own pace</span></div><div class="setup-options"><label>Practice direction<select id="direction"><option value="es-en">Spanish → English</option><option value="en-es">English → Spanish</option></select></label><label>Session length<select id="count"><option value="98">All 98 questions</option><option value="10">10 questions · quick practice</option><option value="20">20 questions · a little more</option></select></label></div><button class="primary start" id="start">Start practicing ${arrow}</button><p class="quiet-note">No timer. No pressure. Just practice.</p></div><aside class="topics-card"><p class="eyebrow">WHAT YOU’LL LEARN</p>${[
      ["01", "Greetings", "Say hello. Keep it going."],
      ["02", "Introductions", "Make a new connection."],
      ["03", "Calendar", "Days, dates & months."],
      ["04", "Weather", "A little everyday small talk."],
    ]
      .map(
        ([number, title, description]) =>
          `<div class="topic"><span>${number}</span><div><h3>${title}</h3><p>${description}</p></div></div>`,
      )
      .join(
        "",
      )}<button id="browse" class="text-button">Explore all 98 terms <span aria-hidden="true">→</span></button></aside></section><div class="how-it-works"><span class="eyebrow">A SIMPLE WAY TO LEARN</span><span><b>01</b> Read the phrase</span><span><b>02</b> Choose a meaning</span><span><b>03</b> Learn as you go</span></div>`;
  document.querySelector("#direction").value = direction;
  document.querySelector("#count").value = String(count);
  document.querySelector("#direction").onchange = (event) => {
    direction = event.target.value;
  };
  document.querySelector("#count").onchange = (event) => {
    count = Number(event.target.value);
  };
  document.querySelector("#start").onclick = () => startSession(cards, count);
  document.querySelector("#browse").onclick = showVocabulary;
}
function startSession(selected, size = selected.length) {
  session = createSession(selected, cards, { direction, count: size });
  renderQuestion();
}

function renderQuestion(focusTarget) {
  if (session.index >= session.questions.length) return showResults();
  setScreen("question");
  const question = session.questions[session.index];
  const response = session.responses[session.index];
  const showCorrect = response && (response.correct || question.revealed);
  const total = session.questions.length;
  main.innerHTML = `<section class="practice-shell"><div class="practice-top"><button class="text-button" id="back">← Practice setup</button><span class="pill">${session.direction === "es-en" ? "SPANISH → ENGLISH" : "ENGLISH → SPANISH"}</span></div><div class="progress-heading"><span>Question <b>${session.index + 1}</b> of ${total}</span><span id="score" role="status"><b>${session.correct}</b> correct out of <b>${session.answered}</b> answered</span></div><progress max="${total}" value="${session.answered}" aria-label="Questions answered">${session.answered} / ${total}</progress><div class="question-card"><div class="question-meta"><span class="eyebrow">CHOOSE THE ${session.direction === "es-en" ? "ENGLISH" : "SPANISH"} MEANING</span><span class="category">${question.card.category}</span></div><h1 tabindex="-1" lang="${session.direction === "es-en" ? "es" : "en"}">${escapeHtml(question.prompt)}</h1><p class="question-hint">${question.eliminated.length ? "Hint: two wrong choices removed. You’re halfway there." : "One phrase. Four possibilities. You’ve got this."}</p><div class="answers">${question.options
    .map((option, index) => {
      const right = showCorrect && option === question.answer;
      const wrong = response && !response.correct && option === response.choice;
      const eliminated = question.eliminated.includes(option);
      return `<button class="answer ${right ? "right" : ""} ${wrong ? "wrong" : ""} ${eliminated ? "eliminated" : ""}" data-choice="${index}" ${response || eliminated ? "disabled" : ""}><span class="answer-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span lang="${session.direction === "es-en" ? "en" : "es"}">${escapeHtml(option)}</span>${right ? '<span class="answer-state">✓ Correct</span>' : wrong ? '<span class="answer-state">✕ Your answer</span>' : eliminated ? '<span class="answer-state">Removed by hint</span>' : ""}</button>`;
    })
    .join(
      "",
    )}</div><div class="question-bottom">${response ? `<div class="feedback ${response.correct ? "success" : "try-again"}" role="status"><strong>${response.correct ? "¡Muy bien! You got it." : response.choice === null ? "Skipped. You can revisit this one." : "Not quite. Every try helps you learn."}</strong><span>${response.correct ? "One more phrase in your pocket." : question.revealed ? `Correct answer: ${escapeHtml(question.answer)}` : "Reveal the answer, or keep going when you’re ready."}</span></div><div class="feedback-actions">${!response.correct ? `<button id="reveal" class="secondary" ${question.revealed ? "disabled" : ""}>${question.revealed ? "Answer shown" : "Show correct answer"}</button>` : ""}<button id="next" class="primary">${session.index + 1 === total ? "See results" : "Continue to next question"} <span aria-hidden="true">→</span></button></div>` : `<div class="question-tools"><button id="hint" class="secondary" ${question.eliminated.length ? "disabled" : ""}>${question.eliminated.length ? "Hint used" : "Hint"}</button><button id="skip" class="text-button">Skip <span aria-hidden="true">→</span></button></div><span class="keyboard-hint">Use keys <kbd>1</kbd>–<kbd>4</kbd> to choose</span>`}</div></div><p class="practice-note">${response ? "Every answer is a step forward." : "Hints remove two choices. Skipped questions count as missed."}</p></section>`;
  document.querySelector("#back").onclick = () => {
    session = null;
    showHome();
    focusHeading();
  };
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.onclick = () =>
      submitAnswer(question.options[Number(button.dataset.choice)]);
  });
  if (response) {
    document.querySelector("#next").onclick = nextQuestion;
    const reveal = document.querySelector("#reveal");
    if (reveal)
      reveal.onclick = () => {
        question.revealed = true;
        renderQuestion("next");
      };
    document
      .querySelector(
        focusTarget
          ? `#${focusTarget}`
          : !response.correct && !question.revealed
            ? "#reveal"
            : "#next",
      )
      .focus();
  } else {
    document.querySelector("#skip").onclick = () => submitAnswer(null);
    document.querySelector("#hint").onclick = () => {
      if (useHint(session)) renderQuestion("answer");
    };
    if (focusTarget === "answer")
      document.querySelector(".answer:not(:disabled)").focus();
    else focusHeading();
  }
}
function submitAnswer(choice) {
  if (answerQuestion(session, choice)) renderQuestion();
}
function nextQuestion() {
  if (advanceQuestion(session)) renderQuestion();
}

function showResults() {
  setScreen("results");
  const missed = session.responses
    .filter((response) => !response.correct)
    .map((response) => response.card);
  const percentage = Math.round((session.correct / session.answered) * 100);
  main.innerHTML = `<section class="results"><p class="eyebrow">SESSION COMPLETE</p><div class="result-star" aria-hidden="true">✳</div><h1 tabindex="-1" lang="es">${missed.length ? "¡Buen trabajo!" : "¡Perfecto!"}</h1><p class="intro">${missed.length ? "A little practice goes a long way. Let’s keep it going." : "You got every question right. Look at you go!"}</p><div class="result-score"><strong>${session.correct}<span> / ${session.answered}</span></strong><p>correct out of ${session.answered} answered</p><span class="pill">${percentage}% ACCURACY</span></div><div class="result-actions">${missed.length ? `<button id="retry" class="primary">Practice ${missed.length} missed ${missed.length === 1 ? "term" : "terms"} ${arrow}</button>` : ""}<button id="again" class="${missed.length ? "secondary" : "primary"}">Practice again ↗</button><button id="setup" class="text-button">Back to setup</button></div>${missed.length ? `<div class="review"><h2>A little more practice</h2><p class="muted">Here are the phrases to revisit.</p>${missed.map((card) => `<div class="review-row"><span lang="es">${escapeHtml(card.es)}</span><span>${escapeHtml(card.en)}</span></div>`).join("")}</div>` : ""}</section>`;
  if (missed.length)
    document.querySelector("#retry").onclick = () => startSession(missed);
  document.querySelector("#again").onclick = () => startSession(cards, count);
  document.querySelector("#setup").onclick = () => {
    session = null;
    showHome();
    focusHeading();
  };
  focusHeading();
}

function showVocabulary() {
  setScreen("vocabulary");
  main.innerHTML = `<section class="vocabulary"><p class="eyebrow">GET TO KNOW YOUR WORDS</p><h1 tabindex="-1">Your everyday Spanish.</h1><p class="intro">All 98 terms. A whole lot of possibilities.</p><label class="search-label" for="search">Find a word or phrase</label><input id="search" type="search" placeholder="Try “hola”, “Monday”, or “weather”…" autocomplete="off"><div class="word-count" id="word-count" role="status"></div><div id="word-list"></div></section>`;
  const draw = () => {
    const simplify = (text) =>
      text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    const query = simplify(document.querySelector("#search").value.trim());
    const filtered = cards.filter((card) =>
      simplify(`${card.es} ${card.en} ${card.category}`).includes(query),
    );
    document.querySelector("#word-count").textContent =
      `${filtered.length} of ${cards.length} terms`;
    document.querySelector("#word-list").innerHTML = filtered.length
      ? filtered
          .map(
            (card) =>
              `<div class="word-row"><span class="word-number">${String(card.id).padStart(2, "0")}</span><strong lang="es">${escapeHtml(card.es)}</strong><span>${escapeHtml(card.en)}</span><span class="category">${card.category}</span></div>`,
          )
          .join("")
      : '<p class="empty-state">No matching terms. Try another Spanish or English word.</p>';
  };
  document.querySelector("#search").oninput = draw;
  draw();
  focusHeading();
}
practiceTab.onclick = () => {
  if (session) renderQuestion();
  else {
    showHome();
    focusHeading();
  }
};
vocabularyTab.onclick = showVocabulary;
document.addEventListener("keydown", (event) => {
  if (
    screen !== "question" ||
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
  if (/^[1-4]$/.test(event.key) && !session.responses[session.index]) {
    event.preventDefault();
    submitAnswer(
      session.questions[session.index].options[Number(event.key) - 1],
    );
  }
});
showHome();
