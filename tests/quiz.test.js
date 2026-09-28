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
  weightedShuffle,
  unpracticedCards,
  markAnswerCorrect,
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

test("weighted practice selection prioritizes missed cards and lowers done cards", () => {
  const [done, missed, fresh] = cards;
  const order = weightedShuffle(
    [done, missed, fresh],
    { [done.id]: 0.1, [missed.id]: 9, [fresh.id]: 1 },
    () => 0.5,
  );
  assert.equal(order[0].id, missed.id);

  const session = createSession([done, missed, fresh], cards, {
    direction: "es-en",
    weights: { [done.id]: 0.1, [missed.id]: 9, [fresh.id]: 1 },
    random: () => 0.5,
  });
  assert.equal(session.questions[0].card.id, missed.id);
  assert.equal(
    new Set(session.questions.map((question) => question.card.id)).size,
    3,
  );
});
test("missed cards retry after one card and complete after two spaced correct answers", () => {
  const [a, b, c, d, e, f, g] = cards;
  const session = createSession([a, b, c, d, e, f, g], cards, {
    direction: "es-en",
    random: () => 0,
  });
  const first = session.questions[0];
  assert.equal(advanceQuestion(session), false);
  assert.equal(answerQuestion(session, "not an option"), false);
  assert.equal(
    answerQuestion(
      session,
      first.options.find((x) => x !== first.answer),
    ),
    true,
  );
  assert.equal(answerQuestion(session, first.answer), false);
  assert.equal(session.correct, 0);
  assert.equal(session.answered, 1);
  assert.deepEqual(
    session.questions.slice(0, 3).map((question) => question.card.id),
    [a.id, b.id, a.id],
  );

  advanceQuestion(session);
  const questionB = session.questions[session.index];
  assert.equal(questionB.card.id, b.id);
  answerQuestion(session, questionB.answer);
  advanceQuestion(session);
  const retryA = session.questions[session.index];
  assert.equal(retryA.card.id, a.id);
  answerQuestion(session, retryA.answer);
  assert.equal(session.answered, 2);
  assert.equal(session.correct, 1);
  assert.equal(session.cardStates[a.id].complete, false);
  assert.equal(session.questions[7].card.id, a.id);
  assert.deepEqual(
    session.questions.slice(3, 8).map((question) => question.card.id),
    [c.id, d.id, e.id, f.id, a.id],
  );

  advanceQuestion(session);
  for (const card of [c, d, e, f]) {
    assert.equal(session.questions[session.index].card.id, card.id);
    answerQuestion(session, session.questions[session.index].answer);
    advanceQuestion(session);
  }
  assert.equal(session.questions[session.index].card.id, a.id);
  const finalA = session.questions[session.index];
  answerQuestion(session, finalA.answer);
  assert.equal(session.cardStates[a.id].complete, true);
  assert.equal(session.completed, 6);
  assert.equal(session.answered, 6);
  assert.equal(session.correct, 6);
});

test("typed retries use the same two-correct completion rule", () => {
  const card = cards.find((item) => item.es === "Buenos días.");
  const session = createSession([card], cards, {
    direction: "es-en",
    mode: "typed",
  });
  submitTypedAnswer(session, "wrong");
  assert.equal(session.answered, 1);
  assert.equal(session.correct, 0);
  advanceQuestion(session);
  submitTypedAnswer(session, "good morning");
  assert.equal(session.correct, 0);
  assert.equal(session.cardStates[card.id].complete, false);
  advanceQuestion(session);
  submitTypedAnswer(session, "good morning");
  assert.equal(session.answered, 1);
  assert.equal(session.correct, 1);
  assert.equal(session.completed, 1);
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
    for (const count of [1, 2, 10, 20, 30, 40, 50, 98]) {
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

test("30, 40, and 50 card round sizes select that many distinct cards", () => {
  for (const count of [30, 40, 50]) {
    const session = createSession(cards, cards, {
      direction: "es-en",
      count,
    });
    assert.equal(session.totalCards, count);
    assert.equal(new Set(session.questions.map(({ card }) => card.id)).size, count);
  }
});

test("new practice rounds exclude every card already shown in practice", () => {
  const firstRound = createSession(cards, cards, {
    direction: "es-en",
    count: 20,
  });
  const practicedIds = new Set(firstRound.questions.map(({ card }) => card.id));
  const fresh = unpracticedCards(cards, practicedIds);
  const secondRound = createSession(fresh, cards, {
    direction: "es-en",
    count: 30,
  });
  assert.equal(secondRound.totalCards, 30);
  assert.ok(
    secondRound.questions.every(({ card }) => !practicedIds.has(card.id)),
  );
  assert.equal(
    new Set(secondRound.questions.map(({ card }) => card.id)).size,
    30,
  );

  const practicedFirstEighty = new Set(
    cards.slice(0, 80).map(({ id }) => id),
  );
  const onlyEighteenNew = unpracticedCards(cards, practicedFirstEighty);
  const shorterRound = createSession(onlyEighteenNew, cards, {
    direction: "es-en",
    count: 30,
  });
  assert.equal(shorterRound.totalCards, 18);
});

test("test mode scores one attempt per exact selected card without retrying misses", () => {
  const selected = [cards[0], cards[4], cards[8], cards[12]];
  let seed = 7;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  const test = createSession(selected, cards, {
    direction: "es-en",
    mode: "typed",
    testMode: true,
    random,
  });
  assert.equal(test.testMode, true);
  assert.deepEqual(
    new Set(test.questions.map(({ card }) => card.id)),
    new Set(selected.map(({ id }) => id)),
  );
  assert.notDeepEqual(
    test.questions.map(({ card }) => card.id),
    selected.map(({ id }) => id),
  );

  const first = test.questions[0];
  assert.equal(submitTypedAnswer(test, "definitely wrong"), true);
  assert.equal(test.questions.length, selected.length);
  assert.equal(test.answered, 1);
  assert.equal(test.correct, 0);
  assert.equal(test.completed, 1);
  assert.equal(advanceQuestion(test), true);
  while (test.index < test.questions.length) {
    const question = test.questions[test.index];
    assert.equal(submitTypedAnswer(test, question.answer), true);
    assert.equal(advanceQuestion(test), true);
  }
  assert.equal(test.answered, selected.length);
  assert.equal(test.correct, selected.length - 1);
  assert.equal(test.completed, selected.length);
  assert.ok(test.cardStates[first.card.id].complete);
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

  for (const direction of ["en-es", "es-en"]) {
    const combinedSession = createSession([slashCard], cards, {
      direction,
      mode: "typed",
    });
    assert.equal(
      submitTypedAnswer(combinedSession, combinedSession.questions[0].answer),
      true,
      `the full displayed answer should be accepted for ${direction}`,
    );
    assert.equal(combinedSession.responses[0].correct, true);
  }

  const accentedCard = cards.find((card) => card.es === "miércoles");
  const accentSession = createSession([accentedCard], cards, {
    direction: "en-es",
    mode: "typed",
  });
  assert.equal(submitTypedAnswer(accentSession, "miercoles"), true);
  assert.equal(accentSession.correct, 1);
});

test("self-check records correct answers without input in both modes, including tests", () => {
  for (const mode of ["multiple-choice", "typed"]) {
    for (const testMode of [false, true]) {
      const session = createSession([cards[0]], cards, {
        direction: "es-en",
        mode,
        testMode,
      });
      assert.equal(markAnswerCorrect(session), true);
      assert.equal(session.responses[0].correct, true);
      assert.equal(session.responses[0].selfReported, true);
      assert.equal(session.answered, 1);
      assert.equal(session.correct, 1);
      assert.equal(session.completed, 1);
      assert.equal(markAnswerCorrect(session), false);
      assert.equal(session.answered, 1);
    }
  }
});

test("typed translations do not require formal or familiar labels", () => {
  const taggedTranslations = cards.filter((card) =>
    /\((?:formal|familiar)\)$/i.test(card.en),
  );
  assert.ok(taggedTranslations.length > 0);
  for (const card of taggedTranslations) {
    const session = createSession([card], cards, {
      direction: "es-en",
      mode: "typed",
    });
    const withoutLabel = card.en.replace(/\s*\((?:formal|familiar)\)$/i, "");
    assert.equal(
      submitTypedAnswer(session, withoutLabel),
      true,
      `${card.es} should accept its translation without the formality label`,
    );
  }
});

test("typed Spanish answers preserve formal and familiar grammar", () => {
  for (const [familiarText, formalText, familiarAnswer, formalAnswer] of [
    [
      "¿De dónde eres?",
      "¿De dónde es usted?",
      "¿De dónde eres?",
      "¿De dónde es usted?",
    ],
    [
      "¿Cómo te llamas?",
      "¿Cómo se llama usted?",
      "¿Cómo te llamas?",
      "¿Cómo se llama usted?",
    ],
  ]) {
    const familiar = cards.find((card) => card.es === familiarText);
    const formal = cards.find((card) => card.es === formalText);
    const familiarSession = createSession([familiar], cards, {
      direction: "en-es",
      mode: "typed",
    });
    const formalSession = createSession([formal], cards, {
      direction: "en-es",
      mode: "typed",
    });

    assert.equal(submitTypedAnswer(familiarSession, familiarAnswer), true);
    assert.equal(submitTypedAnswer(formalSession, formalAnswer), true);

    const wrongFormalSession = createSession([formal], cards, {
      direction: "en-es",
      mode: "typed",
    });
    assert.equal(submitTypedAnswer(wrongFormalSession, familiarAnswer), true);
    assert.equal(wrongFormalSession.responses[0].correct, false);
    assert.equal(wrongFormalSession.correct, 0);
  }
});

test("typed Spanish answers treat instructional parentheticals as optional", () => {
  const greeting = cards.find((card) => card.es === "Encantado(a).");
  for (const answer of ["encantado", "encantada"]) {
    const session = createSession([greeting], cards, {
      direction: "en-es",
      mode: "typed",
    });
    assert.equal(submitTypedAnswer(session, answer), true);
    assert.equal(session.responses[0].correct, true);
  }

  const name = cards.find((card) => card.es === "(Yo) me llamo (name)");
  for (const answer of ["me llamo", "yo me llamo"]) {
    const session = createSession([name], cards, {
      direction: "en-es",
      mode: "typed",
    });
    assert.equal(submitTypedAnswer(session, answer), true);
    assert.equal(session.responses[0].correct, true);
  }
});

test("typed answers accept contractions, expanded phrases, and title abbreviations", () => {
  const cases = [
    { es: "Yo soy de…", direction: "es-en", answer: "I am from" },
    {
      es: "Estoy bien, gracias.",
      direction: "es-en",
      answer: "I am fine, thanks",
    },
    { es: "¿Qué tal?", direction: "es-en", answer: "What is up" },
    { es: "Hace calor", direction: "es-en", answer: "It is hot" },
    { es: "Hay relámpagos", direction: "es-en", answer: "There is lightning" },
    { es: "señora (Sra.)", direction: "en-es", answer: "señora" },
    { es: "señora (Sra.)", direction: "en-es", answer: "Sra." },
    { es: "señor", direction: "es-en", answer: "sir" },
    { es: "señor", direction: "es-en", answer: "Mr." },
    { es: "señor", direction: "es-en", answer: "mister" },
    { es: "señora (Sra.)", direction: "es-en", answer: "ma'am" },
    { es: "señora (Sra.)", direction: "es-en", answer: "Mrs." },
  ];
  for (const { es, direction, answer } of cases) {
    const card = cards.find((item) => item.es === es);
    const session = createSession([card], cards, {
      direction,
      mode: "typed",
    });
    assert.equal(
      submitTypedAnswer(session, answer),
      true,
      `${JSON.stringify(answer)} should be accepted for ${card[direction === "es-en" ? "en" : "es"]}`,
    );
    assert.equal(session.responses[0].correct, true);
  }
});

test("typed answers accept either form of slash-marked Spanish gender endings", () => {
  const card = cards.find((item) => item.es === "mi mejor amigo /a");
  for (const answer of [
    "mi mejor amigo",
    "mi mejor amiga",
    "mi mejor amigo/a",
  ]) {
    const session = createSession([card], cards, {
      direction: "en-es",
      mode: "typed",
    });
    assert.equal(submitTypedAnswer(session, answer), true, answer);
    assert.equal(session.responses[0].correct, true, answer);
  }
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

test("skipped cards return immediately after the next card without affecting score", () => {
  const [a, b, c, d] = cards;
  const session = createSession([a, b, c, d], cards, {
    direction: "es-en",
    random: () => 0,
  });
  const skipped = session.questions[0];
  selectAnswer(session, skipped.answer);
  useHint(session, () => 0);
  assert.equal(skipQuestion(session), true);
  assert.equal(skipQuestion(session), false);
  assert.equal(session.skipCount, 1);
  assert.equal(confirmAnswer(session), false);
  assert.equal(session.correct, 0);
  assert.equal(session.answered, 0);
  advanceQuestion(session);
  assert.equal(session.index, 0);
  assert.equal(session.questions[0].card.id, b.id);
  assert.equal(session.questions[1].card.id, a.id);
  assert.equal(session.questions[1].selected, null);
  assert.equal(session.questions[1].revealed, false);
  assert.deepEqual(session.questions[1].eliminated, []);
});

test("skips for all 98 cards preserve score and require two correct reviews per skipped card", () => {
  const session = createSession(cards, cards);
  for (let i = 0; i < 98; i++) {
    skipQuestion(session);
    advanceQuestion(session);
  }
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
  assert.equal(session.completed, 98);
  assert.equal(new Set(session.responses.map((r) => r.card.id)).size, 98);
  assert.equal(skipQuestion(session), false);
});

test("skipping the last pending question cannot finish the session", () => {
  const [a, b] = cards;
  const session = createSession([a, b], cards, {
    count: 2,
    direction: "es-en",
    random: () => 0,
  });
  answerQuestion(
    session,
    session.questions[0].options.find((o) => o !== session.questions[0].answer),
  );
  advanceQuestion(session);
  assert.equal(session.questions[session.index].card.id, b.id);
  skipQuestion(session);
  advanceQuestion(session);
  assert.equal(session.index, 1);
  assert.equal(session.questions[session.index].card.id, a.id);
  assert.equal(session.questions[session.index + 1].card.id, b.id);
  assert.equal(session.skipCount, 1);
  assert.equal(session.answered, 1);
  assert.equal(session.correct, 0);
  assert.equal(session.completed, 0);
});
