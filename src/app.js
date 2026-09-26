import { cards } from "./cards.js?v=20260926-2";
import {
  createSession,
  skipQuestion,
  advanceQuestion,
  useHint,
  selectAnswer,
  confirmAnswer,
  submitTypedAnswer,
} from "./quiz.js?v=20260926-2";

const main = document.querySelector("#main");
const practiceTab = document.querySelector("#practice-tab");
const vocabularyTab = document.querySelector("#vocabulary-tab");
let session = null;
let direction = "mixed";
let count = cards.length;
let mode = "multiple-choice";
let screen = "home";
let speechRecognition = null;
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
    <section class="welcome"><div><h1 tabindex="-1">Spanish practice</h1><p class="intro">98 terms: greetings, introductions, calendar, and weather.</p></div></section>
    <section class="home-grid" aria-label="Practice setup"><div class="setup-card"><h2>Practice setup</h2><div class="setup-options"><label>Practice direction<select id="direction"><option value="mixed">Both English and Spanish</option><option value="es-en">Spanish → English</option><option value="en-es">English → Spanish</option></select></label><label>Session length<select id="count"><option value="98">All 98 questions</option><option value="10">10 questions</option><option value="20">20 questions</option></select></label><label>Answer format<select id="mode"><option value="multiple-choice">Multiple choice</option><option value="typed">Type the answer</option></select></label></div><button class="primary start" id="start">Start practicing ${arrow}</button></div><aside class="topics-card"><h2>Vocabulary</h2><p class="muted">Review or search all 98 Spanish terms and their English translations.</p><button id="browse" class="text-button">View vocabulary <span aria-hidden="true">→</span></button></aside></section>`;
  document.querySelector("#direction").value = direction;
  document.querySelector("#count").value = String(count);
  document.querySelector("#mode").value = mode;
  document.querySelector("#direction").onchange = (event) => {
    direction = event.target.value;
  };
  document.querySelector("#count").onchange = (event) => {
    count = Number(event.target.value);
  };
  document.querySelector("#mode").onchange = (event) => {
    mode = event.target.value;
  };
  document.querySelector("#start").onclick = () => startSession(cards, count);
  document.querySelector("#browse").onclick = showVocabulary;
}
function startSession(selected, size = selected.length) {
  stopSpeechRecognition();
  session = createSession(selected, cards, { direction, count: size, mode });
  renderQuestion();
}

function renderQuestion(focusTarget) {
  stopSpeechRecognition();
  if (session.index >= session.questions.length) return showResults();
  setScreen("question");
  const question = session.questions[session.index];
  const response =
    session.responses[session.index] ??
    (session.questions[session.index]?.skipped
      ? { correct: false, choice: null }
      : null);
  const showCorrect = response && (response.correct || question.revealed);
  const total = session.questions.length;
  main.innerHTML = `<section class="practice-shell"><div class="practice-top"><button class="text-button" id="back">← Practice setup</button><span class="pill">${question.direction === "es-en" ? "SPANISH → ENGLISH" : "ENGLISH → SPANISH"}</span></div><div class="progress-heading"><span>Question <b>${session.index + 1}</b> of ${total}</span><div class="session-stats"><span id="score" role="status"><b>${session.correct}</b> correct out of <b>${session.answered}</b> answered</span><span id="skipped-count" role="status"><b>${session.skipCount}</b> skipped</span></div></div><progress max="${total}" value="${session.answered}" aria-label="Questions answered">${session.answered} / ${total}</progress><div class="question-card"><div class="question-meta"><span class="eyebrow">${session.mode === "typed" ? "TYPE THE" : "CHOOSE THE"} ${question.direction === "es-en" ? "ENGLISH" : "SPANISH"} MEANING</span></div>${response ? `<div tabindex="-1" class="feedback ${response.correct ? "success" : "try-again"}"><strong><span aria-hidden="true">${response.correct ? "✓" : response.choice === null ? "→" : "✕"}</span> ${response.correct ? "Correct!" : response.choice === null ? "Skipped" : "Incorrect"}</strong>${question.revealed ? `<span>Correct answer: ${escapeHtml(question.answer)}</span>` : question.skipped ? "<span>Still unanswered. This question will appear again.</span>" : ""}</div>` : ""}<h1 tabindex="-1" lang="${question.direction === "es-en" ? "es" : "en"}">${escapeHtml(question.prompt)}</h1>${question.eliminated.length ? '<p class="question-hint" role="status">Two wrong choices removed.</p>' : ""}${
    session.mode === "typed"
      ? `<div class="typed-answer"><label for="typed-answer">Your answer</label><div class="typed-controls"><input id="typed-answer" type="text" autocomplete="off" value="${escapeHtml(response?.choice ?? "")}" ${response ? "disabled" : ""} aria-label="Your ${question.direction === "es-en" ? "English" : "Spanish"} answer"><button id="speak" class="secondary" type="button" ${response ? "disabled" : ""}>🎙 Speak answer</button></div><p id="speech-status" class="speech-status" role="status" aria-live="polite">Speech input uses your browser's speech recognition, when available.</p></div>`
      : `<div class="answers">${question.options
          .map((option, index) => {
            const right = showCorrect && option === question.answer;
            const wrong =
              response && !response.correct && option === response.choice;
            const eliminated = question.eliminated.includes(option);
            const selected = !response && question.selected === option;
            return `<button class="answer ${right ? "right" : ""} ${wrong ? "wrong" : ""} ${eliminated ? "eliminated" : ""} ${selected ? "selected" : ""}" aria-pressed="${selected}" data-choice="${index}" ${response || eliminated ? "disabled" : ""}><span class="answer-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span lang="${question.direction === "es-en" ? "en" : "es"}">${escapeHtml(option)}</span>${right ? '<span class="answer-state">✓ Correct</span>' : wrong ? '<span class="answer-state">✕ Your answer</span>' : eliminated ? '<span class="answer-state">Removed by hint</span>' : selected ? '<span class="answer-state">Selected</span>' : ""}</button>`;
          })
          .join("")}</div>`
  }<div class="question-bottom">${response ? `<div class="feedback-actions">${!response.correct ? `<button id="reveal" class="secondary" ${question.revealed ? "disabled" : ""}>${question.revealed ? "Answer shown" : "Show correct answer"}</button>` : ""}<button id="next" class="primary">${!question.skipped && session.index + 1 === total ? "See results" : "Continue to next question"} <span aria-hidden="true">→</span></button></div>` : `<div class="question-tools">${session.mode === "multiple-choice" ? `<button id="hint" class="secondary" ${question.eliminated.length ? "disabled" : ""}>${question.eliminated.length ? "Hint used" : "Hint"}</button>` : ""}<button id="skip" class="text-button">Skip <span aria-hidden="true">→</span></button></div><button id="confirm" class="primary" ${session.mode === "typed" ? "disabled" : question.selected === null ? "disabled" : ""}>Confirm answer</button>`}</div></div></section>`;
  document.querySelector("#back").onclick = () => {
    session = null;
    showHome();
    focusHeading();
  };
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.onclick = () =>
      chooseAnswer(question.options[Number(button.dataset.choice)]);
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
      .querySelector(focusTarget ? `#${focusTarget}` : ".feedback")
      .focus();
  } else {
    if (session.mode === "typed") {
      const input = document.querySelector("#typed-answer");
      const confirm = document.querySelector("#confirm");
      confirm.disabled = !input.value.trim();
      input.oninput = () => {
        confirm.disabled = !input.value.trim();
      };
      input.onkeydown = (event) => {
        if (event.key === "Enter" && !confirm.disabled) confirm.click();
      };
      document.querySelector("#speak").onclick = toggleSpeechRecognition;
      if (focusTarget === "answer") input.focus();
      else focusHeading();
    }
    document.querySelector("#confirm").onclick = () => {
      const submitted =
        session.mode === "typed"
          ? submitTypedAnswer(
              session,
              document.querySelector("#typed-answer").value,
            )
          : confirmAnswer(session);
      if (submitted) {
        renderQuestion();
        announceResult();
      }
    };
    document.querySelector("#skip").onclick = () => {
      if (skipQuestion(session)) {
        renderQuestion();
        announceResult();
      }
    };
    const hint = document.querySelector("#hint");
    if (hint)
      hint.onclick = () => {
        if (useHint(session)) renderQuestion("answer");
      };
    if (session.mode === "typed") return;
    if (focusTarget === "selection")
      document.querySelector('.answer[aria-pressed="true"]').focus();
    else if (focusTarget === "answer")
      document.querySelector(".answer:not(:disabled)").focus();
    else focusHeading();
  }
}
function stopSpeechRecognition() {
  if (speechRecognition) {
    speechRecognition.onend = null;
    speechRecognition.stop();
    speechRecognition = null;
  }
}
function toggleSpeechRecognition() {
  const Recognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const button = document.querySelector("#speak");
  const status = document.querySelector("#speech-status");
  if (!Recognition) {
    status.textContent =
      "Speech recognition is not available in this browser. You can type your answer instead.";
    button.disabled = true;
    return;
  }
  if (speechRecognition) {
    stopSpeechRecognition();
    button.textContent = "🎙 Speak answer";
    status.textContent = "Speech input stopped.";
    return;
  }
  const recognition = new Recognition();
  speechRecognition = recognition;
  recognition.lang =
    session.questions[session.index].direction === "es-en" ? "en-US" : "es-ES";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    button.textContent = "Stop listening";
    status.textContent = "Listening…";
  };
  recognition.onresult = (event) => {
    document.querySelector("#typed-answer").value =
      event.results[0][0].transcript;
    document
      .querySelector("#typed-answer")
      .dispatchEvent(new Event("input", { bubbles: true }));
    status.textContent = `Heard: ${event.results[0][0].transcript}`;
  };
  recognition.onerror = (event) => {
    status.textContent =
      event.error === "not-allowed"
        ? "Microphone access was denied. You can type your answer instead."
        : "Speech input could not capture an answer. Try again or type it instead.";
  };
  recognition.onend = () => {
    if (speechRecognition === recognition) {
      speechRecognition = null;
      button.textContent = "🎙 Speak answer";
    }
  };
  try {
    recognition.start();
  } catch {
    speechRecognition = null;
    status.textContent =
      "Speech input could not start. You can type your answer instead.";
  }
}
function chooseAnswer(choice) {
  if (selectAnswer(session, choice)) renderQuestion("selection");
}
function announceResult() {
  const response =
    session.responses[session.index] ??
    (session.questions[session.index]?.skipped
      ? { correct: false, choice: null }
      : null);
  document.querySelector("#announcement").textContent = response.correct
    ? `Correct! ${session.correct} correct out of ${session.answered} answered.`
    : response.choice === null
      ? `Question skipped. ${session.skipCount} skipped so far. It remains unanswered and will appear again.`
      : "Incorrect. You can show the correct answer or continue.";
}
function nextQuestion() {
  document.querySelector("#announcement").textContent = "";
  if (advanceQuestion(session)) renderQuestion();
}

function showResults() {
  setScreen("results");
  const missed = session.responses
    .filter((response) => !response.correct)
    .map((response) => response.card);
  const percentage = Math.round((session.correct / session.answered) * 100);
  main.innerHTML = `<section class="results"><h1 tabindex="-1">Session results</h1><div class="result-score"><strong>${session.correct}<span> / ${session.answered}</span></strong><p>correct out of ${session.answered} answered</p><p>${session.skipCount} skipped</p><span class="pill">${percentage}% ACCURACY</span></div><div class="result-actions">${missed.length ? `<button id="retry" class="primary">Practice ${missed.length} missed ${missed.length === 1 ? "term" : "terms"} ${arrow}</button>` : ""}<button id="again" class="${missed.length ? "secondary" : "primary"}">Practice again ↗</button><button id="setup" class="text-button">Back to setup</button></div>${missed.length ? `<div class="review"><h2>Missed terms</h2>${missed.map((card) => `<div class="review-row"><span lang="es">${escapeHtml(card.es)}</span><span>${escapeHtml(card.en)}</span></div>`).join("")}</div>` : ""}</section>`;
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
  main.innerHTML = `<section class="vocabulary"><h1 tabindex="-1">Vocabulary</h1><p class="intro">All 98 Spanish terms and their English translations.</p><label class="search-label" for="search">Find a word or phrase</label><input id="search" type="search" placeholder="Try “hola”, “Monday”, or “weather”…" autocomplete="off"><div class="word-count" id="word-count" role="status"></div><div id="word-list"></div></section>`;
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
              `<div class="word-row"><span class="word-number">${String(card.id).padStart(2, "0")}</span><strong lang="es">${escapeHtml(card.es)}</strong><span>${escapeHtml(card.en)}</span></div>`,
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
    chooseAnswer(
      session.questions[session.index].options[Number(event.key) - 1],
    );
  }
});
showHome();
