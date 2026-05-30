# VisAI — Implementation Plan

## Goal
Convert a UI screenshot/mockup image into HTML + Tailwind code using Google Gemini 2.0 Flash.
Student project, local use only, no auth, no DB, no rate limiting.

---

## Architecture

```
User uploads image
      ↓
UploadSection (client) — FormData POST
      ↓
/api/analyze (Next.js Route Handler) — server-side
      ↓
Google Gemini 2.0 Flash API
      ↓
Returns { analysis: {...}, html: "..." }
      ↓
Store in localStorage
      ↓
Redirect to /hasil
      ↓
HasilPage reads localStorage → displays preview + code
```

---

## Files to Create / Modify

### 1. `.env.local` (create)
```
GEMINI_API_KEY=your_key_here
```

### 2. `app/api/analyze/route.ts` (create)
- Accept `POST` with `FormData` containing `image` file
- Validate: file exists, mime type is image/png | image/jpeg | image/webp, size ≤ 20MB
- Convert to base64 buffer server-side
- Call Gemini API **once** with a single prompt that returns both analysis + HTML
- Return `{ analysis: {...}, html: "..." }`
- Wrap everything in try/catch → return `{ error: "..." }` with status 500 on failure

### 3. `components/UploadSection.tsx` (rewrite)
- Add `"use client"`
- Hidden `<input type="file" accept="image/png,image/jpeg,image/webp" />`
- Click on dropzone → trigger file input
- Drag & drop handlers: `onDragOver`, `onDragLeave`, `onDrop`
- State:
  - `file: File | null` — selected file
  - `preview: string | null` — object URL for image preview
  - `loading: boolean` — while calling API
  - `error: string | null` — error message
- On file select: show image thumbnail + file name + size
- Submit button → POST to `/api/analyze` as FormData
- On success: save result to `localStorage` → `router.push("/hasil")`
- On error: show error message inline

### 4. `components/ResultSection.tsx` (rewrite)
- Add `"use client"`
- Read result from `localStorage` inside `useEffect` (not at render time — localStorage doesn't exist server-side, causes hydration error):
  ```ts
  const [result, setResult] = useState(null);
  useEffect(() => {
    const stored = localStorage.getItem("visai_result");
    if (stored) setResult(JSON.parse(stored));
  }, []);
  ```
- On mount: read result from `localStorage`
- If no result: show current empty state + link to /upload
- If result exists, show two tabs:
  - **Preview tab**: `<iframe srcDoc={html} />` — live render of generated HTML
  - **Kode tab**: syntax-highlighted HTML code block with copy button
- Show analysis JSON summary (title, style, color palette) as metadata cards above tabs
- Button: "Upload Baru" → clear localStorage → go to /upload

---

## Gemini Prompt Strategy

### Single Prompt (returns one JSON object with both keys)
```
Analyze this UI design image and return a single JSON object with exactly two keys:
{
  "analysis": {
    "title": "page/component name",
    "layout": "description of overall layout",
    "components": [{ "name": "", "description": "", "position": "" }],
    "colorPalette": ["#hex", ...],
    "typography": { "headings": "", "body": "", "style": "" },
    "style": "description of design style (minimal, glassmorphism, etc)"
  },
  "html": "complete standalone HTML file string with Tailwind CSS CDN that reproduces this design pixel-faithfully"
}
Return only valid JSON. No markdown, no code fences, no explanation.
```

> **Note:** Only split into two calls if HTML output quality is noticeably better with analysis as a separate grounding step. For now, one call = half the latency + half the quota usage.

### Markdown Fence Cleanup (server-side, before JSON.parse)
Gemini will sometimes return ` ```json ` fences despite instructions. Always strip before parsing:
```ts
const clean = text.replace(/```json|```/g, "").trim();
const result = JSON.parse(clean);
```

---

## Data Flow (localStorage)

Key: `visai_result`  
Value:
```json
{
  "analysis": { "title": "", "layout": "", "components": [], "colorPalette": [], "typography": {}, "style": "" },
  "html": "<!DOCTYPE html>...",
  "timestamp": 1234567890
}
```

---

## Dependencies to Install
```bash
npm install @google/genai
```
> Use `@google/genai` (v2.7.0, newer unified SDK) — **not** `@google/generative-ai` (v0.24.x, older).
> `@google/genai` has first-class Gemini 2.0 Flash support.

---

## Implementation Order
1. Install `@google/genai`
2. Create `.env.local`
3. Create `app/api/analyze/route.ts`
4. Rewrite `components/UploadSection.tsx`
5. Rewrite `components/ResultSection.tsx`
6. Test end-to-end

---

## Out of Scope (student project)
- Rate limiting
- Authentication
- Database / persistent storage
- File storage (S3, etc.)
- Streaming response
- Mobile optimization
