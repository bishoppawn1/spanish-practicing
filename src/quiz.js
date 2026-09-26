export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export const normalize = (text) =>
  text.toLocaleLowerCase().replace(/[\p{P}\s]/gu, "");

export function makeQuestion(
  card,
  pool,
  direction = "es-en",
  random = Math.random,
) {
  const [promptKey, answerKey] =
    direction === "es-en" ? ["es", "en"] : ["en", "es"];
  const seen = new Set([normalize(card[answerKey])]);
  const eligible = shuffle(pool, random).filter(
    (other) => other.id !== card.id && other.equivalent !== card.equivalent,
  );
  eligible.sort(
    (a, b) =>
      Number(b.family === card.family) - Number(a.family === card.family),
  );
  const distractors = [];
  for (const other of eligible) {
    const key = normalize(other[answerKey]);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(other[answerKey]);
    if (distractors.length === 3) break;
  }
  return {
    card,
    direction,
    prompt: card[promptKey],
    answer: card[answerKey],
    options: shuffle([card[answerKey], ...distractors], random),
    eliminated: [],
  };
}
export function createSession(
  selected,
  pool,
  { direction = "mixed", count = selected.length, random = Math.random } = {},
) {
  const firstDirection =
    direction === "mixed" && random() < 0.5 ? "en-es" : "es-en";
  return {
    questions: shuffle(selected, random)
      .slice(0, count)
      .map((card, index) => {
        const questionDirection =
          direction === "mixed"
            ? index % 2 === 0
              ? firstDirection
              : firstDirection === "es-en"
                ? "en-es"
                : "es-en"
            : direction;
        return makeQuestion(card, pool, questionDirection, random);
      }),
    direction,
    index: 0,
    correct: 0,
    answered: 0,
    responses: [],
  };
}
export function answerQuestion(session, choice) {
  const question = session.questions[session.index];
  if (!question || session.responses[session.index]) return false;
  if (
    choice !== null &&
    (!question.options.includes(choice) || question.eliminated.includes(choice))
  )
    return false;
  const correct = choice === question.answer;
  session.responses.push({
    card: question.card,
    choice,
    correct,
    hinted: question.eliminated.length > 0,
  });
  session.answered++;
  if (correct) session.correct++;
  return true;
}
export function useHint(session, random = Math.random) {
  const question = session.questions[session.index];
  if (
    !question ||
    session.responses[session.index] ||
    question.eliminated.length
  )
    return false;
  question.eliminated = shuffle(
    question.options.filter((option) => option !== question.answer),
    random,
  ).slice(0, 2);
  return true;
}
export function advanceQuestion(session) {
  if (!session.responses[session.index]) return false;
  session.index++;
  return true;
}
