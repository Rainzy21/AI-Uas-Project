import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "test" });

const response = await ai.models.generateContent({
  model: "gemini-flash-lite",
  contents: [
    {
      role: "user",
      parts: [
        { text: "Hello" },
        {
          inlineData: {
            mimeType: "image/png",
            data: "base64",
          },
        },
      ],
    },
  ],
  config: {
    temperature: 0.2,
  },
});
