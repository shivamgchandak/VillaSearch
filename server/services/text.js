export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole word or whole phrase match, so "pet" does not match "petrol"
export function hasPhrase(text, phrase) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(phrase)}($|[^a-z0-9])`, "i").test(text);
}

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, twentyfive: 25, thirty: 30,
};

export function normalize(query) {
  let text = ` ${String(query || "").toLowerCase()} `
    .replace(/[\u2013\u2014-]/g, " ")
    .replace(/[?!;]/g, " ")
    .replace(/\s+/g, " ");
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    text = text.replace(new RegExp(`\\b${word}\\b`, "g"), String(num));
  }
  return text;
}
