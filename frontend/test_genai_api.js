const apiKey = "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";

async function run() {
  try {
    console.log("Testing OpenRouter API...");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Hello! If you can see this image, tell me its size and color." },
              {
                type: "image_url",
                image_url: {
                  url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                }
              }
            ]
          }
        ]
      })
    });
    
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenRouter error: ${res.status}`);
    }

    const data = await res.json();
    console.log("Success! Response:");
    console.log(data.choices[0].message.content);
  } catch (err) {
    console.error("Caught error:", err.message);
  }
}

run();
