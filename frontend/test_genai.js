const genai = require("@google/genai");
console.log("genai keys:", Object.keys(genai));
try {
  const { GoogleGenAI } = genai;
  console.log("Is GoogleGenAI a constructor?", typeof GoogleGenAI === "function");
} catch (e) {
  console.error("Error:", e);
}
