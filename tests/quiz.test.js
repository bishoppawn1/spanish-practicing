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
test("correct, wrong, skipped, double-click, completion, and missed-card retry scoring", () => {
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
  answerQuestion(session, null);
  advanceQuestion(session);
  assert.equal(session.index, 3);
  assert.equal(session.correct, 1);
  assert.equal(session.answered, 3);
  assert.equal(answerQuestion(session, null), false);
  assert.equal(advanceQuestion(session), false);
  const missed = session.responses
    .filter((response) => !response.correct)
    .map((response) => response.card);
  const retry = createSession(missed, cards);
  assert.equal(retry.questions.length, 2);
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
