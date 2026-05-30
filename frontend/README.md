# VisAI — UI Design Analyzer

Upload a UI screenshot or mockup (PNG, JPG, WebP) and get a detailed analysis plus a generated HTML+Tailwind reproduction — powered by Google Gemini 2.0 Flash.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env.local` and add your Gemini API key:

   ```bash
   cp .env.example .env.local
   ```

   Get a free API key from [Google AI Studio](https://aistudio.google.com/).

3. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
npm run build
npm start
```

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Tailwind CSS 4](https://tailwindcss.com)
- [Google Gemini 2.0 Flash](https://ai.google.dev/) via `@google/genai`
- TypeScript

## How it works

1. Upload an image on `/upload`.
2. The server converts it to base64 and sends it to Gemini with a structured prompt.
3. Gemini returns a JSON object containing a design analysis and a standalone HTML file.
4. Results are displayed on `/hasil` with a live preview and copyable HTML code.


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
