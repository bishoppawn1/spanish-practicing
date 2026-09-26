import test from "node:test";
import assert from "node:assert/strict";
import { cards } from "../src/cards.js";
import {
  shuffle,
  makeQuestion,
  createSession,
  answerQuestion,
  advanceQuestion,
  normalize,
  useHint,
  selectAnswer,
  confirmAnswer,
  skipQuestion,
  submitTypedAnswer,
} from "../src/quiz.js";

test("all 98 source cards have unique IDs and both translations", () => {
  assert.equal(cards.length, 98);
  assert.equal(new Set(cards.map((card) => card.id)).size, 98);
  for (const card of cards)
    assert.ok(card.es && card.en && card.category && card.equivalent);
});
test("both directions have four distinct choices and exclude equivalent answers", () => {
  for (const direction of ["es-en", "en-es"]) {
    const key = direction === "es-en" ? "en" : "es";
    for (const card of cards) {
      const question = makeQuestion(card, cards, direction);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options.map(normalize)).size, 4);
      assert.equal(
        question.options.filter((option) => option === card[key]).length,
        1,
      );
      for (const equivalent of cards.filter(
        (other) => other.id !== card.id && other.equivalent === card.equivalent,
      )) {
        if (equivalent[key] !== card[key])
          assert.ok(!question.options.includes(equivalent[key]));
      }
    }
  }
});
test("sessions do not repeat cards; shuffling does not mutate vocabulary", () => {
  const ids = cards.map((card) => card.id);
  const session = createSession(cards, cards);
  assert.equal(
    new Set(session.questions.map((question) => question.card.id)).size,
    98,
  );
  shuffle(cards, () => 0);
  assert.deepEqual(
    cards.map((card) => card.id),
    ids,
  );
  assert.equal(createSession(cards, cards, { count: 10 }).questions.length, 10);
});
test("correct, wrong, double-click, completion, and missed-card retry scoring", () => {
  const session = createSession(cards, cards, { count: 3 });
  assert.equal(advanceQuestion(session), false);
  assert.equal(answerQuestion(session, "not an option"), false);
  answerQuestion(session, session.questions[0].answer);
  assert.equal(answerQuestion(session, session.questions[0].answer), false);
  assert.equal(session.correct, 1);
  assert.equal(session.answered, 1);
  advanceQuestion(session);
  answerQuestion(
    session,
    session.questions[1].options.find(
      (option) => option !== session.questions[1].answer,
    ),
  );
  advanceQuestion(session);
  assert.equal(answerQuestion(session, null), false);
  answerQuestion(session, session.questions[2].answer);
  advanceQuestion(session);
  assert.equal(session.index, 3);
  assert.equal(session.correct, 2);
  assert.equal(session.answered, 3);
  assert.equal(answerQuestion(session, null), false);
  assert.equal(advanceQuestion(session), false);
  const missed = session.responses
    .filter((response) => !response.correct)
    .map((response) => response.card);
  const retry = createSession(missed, cards);
  assert.equal(retry.questions.length, 1);
  assert.equal(retry.skipCount, 0);
  assert.equal(retry.correct, 0);
  assert.equal(retry.answered, 0);
  assert.ok(retry.questions.every((question) => question.options.length === 4));
  assert.deepEqual(
    retry.questions.map((q) => q.card.id).sort(),
    missed.map((c) => c.id).sort(),
  );
});
test("months, days and seasons use distractors from the same family", () => {
  for (const card of cards.filter((card) =>
    ["months", "days", "seasons"].includes(card.family),
  )) {
    const question = makeQuestion(card, cards);
    assert.ok(
      question.options.every((option) =>
        cards.some(
          (other) => other.en === option && other.family === card.family,
        ),
      ),
    );
  }
});
test("hints remove only two wrong options, can only be used once, and do not change scores", () => {
  const session = createSession(cards, cards, { count: 1 });
  const question = session.questions[0];
  assert.equal(useHint(session), true);
  assert.equal(question.eliminated.length, 2);
  assert.ok(!question.eliminated.includes(question.answer));
  assert.equal(useHint(session), false);
  assert.equal(session.answered, 0);
  assert.equal(session.correct, 0);
  assert.equal(answerQuestion(session, question.eliminated[0]), false);
  answerQuestion(session, question.answer);
  assert.equal(session.correct, 1);
  assert.equal(session.answered, 1);
  assert.equal(session.responses[0].hinted, true);
  assert.equal(useHint(session), false);
});

test("mixed sessions use both languages with matching prompts and answer languages", () => {
  for (const random of [() => 0.25, () => 0.75]) {
    for (const count of [1, 2, 10, 20, 98]) {
      const session = createSession(cards, cards, { count, random });
      const spanish = session.questions.filter(
        (q) => q.direction === "es-en",
      ).length;
      assert.ok(Math.abs(spanish - (count - spanish)) <= 1);
      assert.equal(
        new Set(session.questions.map((q) => q.card.id)).size,
        count,
      );
      for (const [index, question] of session.questions.entries()) {
        const spanishPrompt = question.direction === "es-en";
        assert.equal(
          question.prompt,
          question.card[spanishPrompt ? "es" : "en"],
        );
        assert.equal(
          question.answer,
          question.card[spanishPrompt ? "en" : "es"],
        );
        if (index)
          assert.notEqual(
            question.direction,
            session.questions[index - 1].direction,
          );
      }
    }
  }
});

test("single-direction sessions retain the selected language", () => {
  for (const direction of ["es-en", "en-es"]) {
    const session = createSession(cards, cards, { direction, count: 10 });
    assert.ok(
      session.questions.every((question) => question.direction === direction),
    );
  }
});

test("typed answers confirm once, accept slash alternatives and ignore accents", () => {
  const slashCard = cards.find((card) => card.es === "Perdón / Lo siento");
  const session = createSession([slashCard], cards, {
    direction: "en-es",
    mode: "typed",
  });
  const question = session.questions[0];
  assert.equal(session.mode, "typed");
  assert.equal(submitTypedAnswer(session, "  "), false);
  assert.equal(session.answered, 0);
  assert.equal(submitTypedAnswer(session, "lo siento"), true);
  assert.equal(session.responses[0].correct, true);
  assert.equal(session.correct, 1);
  assert.equal(session.answered, 1);
  assert.equal(submitTypedAnswer(session, question.answer), false);

  const accentedCard = cards.find((card) => card.es === "miércoles");
  const accentSession = createSession([accentedCard], cards, {
    direction: "en-es",
    mode: "typed",
  });
  assert.equal(submitTypedAnswer(accentSession, "miercoles"), true);
  assert.equal(accentSession.correct, 1);
});

test("selection is changeable and only confirmation counts an answer once", () => {
  const session = createSession(cards, cards, { count: 2 });
  const question = session.questions[0];
  assert.equal(confirmAnswer(session), false);
  const wrong = question.options.find((option) => option !== question.answer);
  assert.equal(selectAnswer(session, wrong), true);
  assert.equal(session.answered, 0);
  assert.equal(session.correct, 0);
  assert.equal(selectAnswer(session, question.answer), true);
  assert.equal(question.selected, question.answer);
  assert.equal(confirmAnswer(session), true);
  assert.equal(session.correct, 1);
  assert.equal(session.answered, 1);
  assert.equal(confirmAnswer(session), false);
  assert.equal(selectAnswer(session, wrong), false);
  advanceQuestion(session);
  assert.equal(session.questions[1].selected, null);
  assert.equal(confirmAnswer(session), false);
});

test("hints clear an eliminated selection and skip does not confirm the selected answer", () => {
  const session = createSession(cards, cards, { count: 2 });
  const question = session.questions[0];
  const wrongChoices = question.options.filter(
    (option) => option !== question.answer,
  );
  selectAnswer(session, wrongChoices[1]);
  useHint(session, () => 0);
  assert.equal(question.selected, null);
  assert.equal(confirmAnswer(session), false);
  assert.equal(selectAnswer(session, question.eliminated[0]), false);
  selectAnswer(session, question.answer);
  skipQuestion(session);
  assert.equal(confirmAnswer(session), false);
  assert.equal(session.correct, 0);
  assert.equal(session.answered, 0);
  assert.equal(session.responses.length, 0);
});

test("skips return to a random pending position without counting or duplicating cards", () => {
  for (const random of [() => 0, () => 0.999]) {
    const session = createSession(cards, cards, { count: 10 });
    answerQuestion(session, session.questions[0].answer);
    advanceQuestion(session);
    const skipped = session.questions[session.index];
    selectAnswer(session, skipped.answer);
    useHint(session);
    assert.equal(skipQuestion(session), true);
    assert.equal(skipQuestion(session), false);
    assert.equal(session.skipCount, 1);
    assert.equal(confirmAnswer(session), false);
    assert.equal(selectAnswer(session, skipped.answer), false);
    assert.equal(useHint(session), false);
    skipped.revealed = true;
    advanceQuestion(session, random);
    assert.equal(session.correct, 1);
    assert.equal(session.answered, 1);
    assert.equal(session.index, 1);
    assert.notEqual(session.questions[1].card.id, skipped.card.id);
    assert.equal(
      session.questions[random() === 0 ? 2 : 9].card.id,
      skipped.card.id,
    );
    assert.equal(new Set(session.questions.map((q) => q.card.id)).size, 10);
    assert.equal(skipped.selected, null);
    assert.equal(skipped.revealed, false);
    assert.deepEqual(skipped.eliminated, []);
  }
});

test("all 98 questions can be skipped and still require 98 unique confirmed answers", () => {
  const session = createSession(cards, cards);
  const skippedIds = new Set();
  for (let i = 0; i < 98; i++) {
    skippedIds.add(session.questions[session.index].card.id);
    skipQuestion(session);
    advanceQuestion(session, () => 0.999);
  }
  assert.equal(skippedIds.size, 98);
  assert.equal(session.skipCount, 98);
  assert.equal(session.answered, 0);
  assert.equal(session.correct, 0);
  assert.equal(session.index, 0);
  while (session.index < session.questions.length) {
    const question = session.questions[session.index];
    selectAnswer(session, question.answer);
    confirmAnswer(session);
    advanceQuestion(session);
  }
  assert.equal(session.skipCount, 98);
  assert.equal(session.correct, 98);
  assert.equal(session.answered, 98);
  assert.equal(new Set(session.responses.map((r) => r.card.id)).size, 98);
  assert.equal(skipQuestion(session), false);
});

test("skipping the last pending question cannot finish the session", () => {
  const session = createSession(cards, cards, { count: 2 });
  answerQuestion(
    session,
    session.questions[0].options.find((o) => o !== session.questions[0].answer),
  );
  advanceQuestion(session);
  const lastId = session.questions[1].card.id;
  for (let i = 0; i < 3; i++) {
    skipQuestion(session);
    advanceQuestion(session);
    assert.equal(session.skipCount, i + 1);
    assert.equal(session.index, 1);
    assert.equal(session.answered, 1);
    assert.equal(session.correct, 0);
    assert.equal(session.questions[1].card.id, lastId);
  }
  selectAnswer(session, session.questions[1].answer);
  confirmAnswer(session);
  advanceQuestion(session);
  assert.equal(session.index, 2);
  assert.equal(session.answered, 2);
  assert.equal(session.correct, 1);
});
