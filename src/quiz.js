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
const answerWordForms = {
  "i'm": "i am",
  "you're": "you are",
  "we're": "we are",
  "they're": "they are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "that's": "that is",
  "there's": "there is",
  "here's": "here is",
  "what's": "what is",
  "who's": "who is",
  "where's": "where is",
  "when's": "when is",
  "how's": "how is",
  "let's": "let us",
  "i've": "i have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",
  "i'll": "i will",
  "you'll": "you will",
  "we'll": "we will",
  "they'll": "they will",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "can't": "cannot",
  "couldn't": "could not",
  "won't": "will not",
  "wouldn't": "would not",
  "shouldn't": "should not",
  "ma'am": "madam",
  "mr.": "mister",
  mr: "mister",
  "mrs.": "missus",
  mrs: "missus",
  "sr.": "senor",
  sr: "senor",
  "sra.": "senora",
  sra: "senora",
  "srta.": "senorita",
  srta: "senorita",
};
const normalizeTypedAnswer = (text) => {
  const canonical = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/’/g, "'")
    .replace(/\s*\((?:formal|familiar)\)\s*$/i, "")
    .replace(
      /\b(?:[\p{L}]+[''][\p{L}]+|mrs?\.?|srta?\.?|sra\.?)\b/gu,
      (word) => answerWordForms[word] ?? word,
    );
  return normalize(canonical);
};
function typedAnswerVariants(answer) {
  let variants = [answer];
  if (/^(sir|ma'am),\s*(?:mr\.?|mrs\.?)$/i.test(answer))
    variants = [
      ...variants,
      ...answer.split(/,\s*/),
    ];
  if (/\(name\)/i.test(answer))
    variants = [
      ...variants,
      ...variants.map((value) => value.replace(/\s*\(name\)/gi, "")),
    ];
  if (/\(yo\)/i.test(answer))
    variants = [
      ...variants,
      ...variants.map((value) => value.replace(/\(yo\)\s*/gi, "")),
    ];
  if (/\([A-Z][A-Za-z]{1,4}\.\)/i.test(answer))
    variants = [
      ...variants,
      ...variants.map((value) =>
        value.replace(/\s*\([A-Z][A-Za-z]{1,4}\.\)/gi, ""),
      ),
    ];
  if (/o\(a\)/i.test(answer)) {
    variants = [
      ...variants,
      ...variants.map((value) => value.replace(/\(a\)/gi, "")),
      ...variants.map((value) => value.replace(/o\s*\(a\)/gi, "a")),
    ];
  }
  if (/o\s*\/\s*a\b/i.test(answer)) {
    variants = [
      ...variants,
      ...variants.map((value) => value.replace(/o\s*\/\s*a\b/gi, "o")),
      ...variants.map((value) => value.replace(/o\s*\/\s*a\b/gi, "a")),
    ];
  }
  return [...new Set(variants.map(normalizeTypedAnswer))];
}

function answerKind(card, key) {
  const text = card[key];
  if (/[¿?]/.test(text) || /^(who|what|when|where|how)\b/i.test(text))
    return "question";
  if (["months", "days", "seasons"].includes(card.family)) return card.family;
  if (/^the (months|days|seasons)\b/i.test(text))
    return `collection-${card.category}`;
  if (
    /^(el |la |los |las |un |una |mi |señor\b|señora\b|señorita\b)/i.test(text)
  )
    return "person-or-noun";
  return `${card.category}-phrase`;
}

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
  const kind = answerKind(card, answerKey);
  const compatible = eligible.filter(
    (other) => answerKind(other, answerKey) === kind,
  );
  const candidates = compatible.length >= 3 ? compatible : eligible;
  candidates.sort(
    (a, b) =>
      Number(b.contrast === card.contrast && Boolean(card.contrast)) -
        Number(a.contrast === card.contrast && Boolean(card.contrast)) ||
      Number(/\s\/\s/.test(a[answerKey])) -
        Number(/\s\/\s/.test(b[answerKey])) ||
      Number(b.family === card.family) - Number(a.family === card.family),
  );
  const distractors = [];
  for (const other of candidates) {
    const key = normalize(other[answerKey]);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(other[answerKey]);
    if (distractors.length === 3) break;
  }
  const options = shuffle([card[answerKey], ...distractors], random);
  const optionCards = Object.fromEntries(
    options.map((option) => [
      option,
      normalize(option) === normalize(card[answerKey])
        ? card
        : (candidates.find(
            (candidate) =>
              normalize(candidate[answerKey]) === normalize(option),
          ) ??
          eligible.find(
            (candidate) =>
              normalize(candidate[answerKey]) === normalize(option),
          )),
    ]),
  );
  return {
    card,
    direction,
    prompt: card[promptKey],
    answer: card[answerKey],
    options,
    optionCards,
    eliminated: [],
    selected: null,
  };
}
export function createSession(
  selected,
  pool,
  {
    direction = "mixed",
    count = selected.length,
    mode = "multiple-choice",
    random = Math.random,
  } = {},
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
    mode,
    index: 0,
    correct: 0,
    answered: 0,
    skipCount: 0,
    responses: [],
  };
}
export function answerQuestion(session, choice) {
  const question = session.questions[session.index];
  if (!question || question.skipped || session.responses[session.index])
    return false;
  if (
    !question.options.includes(choice) ||
    question.eliminated.includes(choice)
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
export function submitTypedAnswer(session, response) {
  const question = session.questions[session.index];
  if (
    !question ||
    question.skipped ||
    session.responses[session.index] ||
    !response.trim()
  )
    return false;
  const acceptedAnswers = [
    ...typedAnswerVariants(question.answer),
    ...question.answer.split(/\s\/\s/).flatMap(typedAnswerVariants),
  ];
  const correct = acceptedAnswers.includes(normalizeTypedAnswer(response));
  session.responses.push({
    card: question.card,
    choice: response.trim(),
    correct,
    hinted: false,
  });
  session.answered++;
  if (correct) session.correct++;
  return true;
}
export function selectAnswer(session, choice) {
  const question = session.questions[session.index];
  if (
    !question ||
    question.skipped ||
    session.responses[session.index] ||
    !question.options.includes(choice) ||
    question.eliminated.includes(choice)
  )
    return false;
  question.selected = choice;
  return true;
}
export function confirmAnswer(session) {
  const question = session.questions[session.index];
  if (!question || question.selected === null) return false;
  return answerQuestion(session, question.selected);
}
export function useHint(session, random = Math.random) {
  const question = session.questions[session.index];
  if (
    !question ||
    question.skipped ||
    session.responses[session.index] ||
    question.eliminated.length
  )
    return false;
  const answerKey = question.direction === "es-en" ? "en" : "es";
  const wrong = question.options.filter((option) => option !== question.answer);
  question.eliminated = shuffle(wrong, random)
    .sort((a, b) => {
      const relevance = (option) => {
        const card = question.optionCards[option];
        return (
          (card?.contrast === question.card.contrast && question.card.contrast
            ? 100
            : 0) +
          (card?.category === question.card.category ? 10 : 0) +
          (card &&
          answerKind(card, answerKey) === answerKind(question.card, answerKey)
            ? 5
            : 0) +
          (card?.family === question.card.family ? 1 : 0)
        );
      };
      return relevance(a) - relevance(b);
    })
    .slice(0, 2);
  if (question.eliminated.includes(question.selected)) question.selected = null;
  return true;
}
export function skipQuestion(session) {
  const question = session.questions[session.index];
  if (!question || question.skipped || session.responses[session.index])
    return false;
  question.skipped = true;
  session.skipCount++;
  return true;
}
export function advanceQuestion(session, random = Math.random) {
  const question = session.questions[session.index];
  if (question?.skipped) {
    session.questions.splice(session.index, 1);
    const remaining = session.questions.length - session.index;
    // Let another pending question appear first, unless this is the last one.
    const position =
      session.index + (remaining ? 1 + Math.floor(random() * remaining) : 0);
    question.skipped = false;
    question.selected = null;
    question.eliminated = [];
    question.revealed = false;
    question.options = shuffle(question.options, random);
    session.questions.splice(position, 0, question);
    return true;
  }
  if (!session.responses[session.index]) return false;
  session.index++;
  return true;
}
