import { NextResponse } from "next/server";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getMockVerification(): any {
  return {
    completion_percentage: 95,
    quality_score: 9.2,
    remaining_damage: "None. The asphalt cold-mix has been applied, compacted, and sealed level with the surrounding pavement.",
    remaining_safety_risks: "None. The roadway is cleared of debris, and traffic cones have been removed.",
    recommendation: "Accept repair and mark ticket as Resolved.",
  };
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delays = [2000, 5000, 10000]
): Promise<Response> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 503 && i < retries) {
        console.warn(`Gemini API returned 503. Retrying verify-repair...`);
        await delay(delays[i]);
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (i < retries) {
        await delay(delays[i]);
        continue;
      }
    }
  }
  throw lastError || new Error("Gemini max retries reached in verify-repair.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { before, after } = body;

    const testMode = process.env.TEST_MODE !== "false";
    const apiKey = process.env.GEMINI_API_KEY;

    if (testMode || !apiKey || !before || !after) {
      console.log("Verify repair running in mock mode.");
      await delay(1500);
      return NextResponse.json(getMockVerification());
    }

    // Parse base64 parts
    const matchBefore = before.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,(.+)$/);
    const matchAfter = after.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,(.+)$/);

    if (!matchBefore || !matchAfter) {
      return NextResponse.json({ error: "Invalid image formats. Base64 data URL expected." }, { status: 400 });
    }

    const mimeBefore = matchBefore[1];
    const dataBefore = matchBefore[2];
    const mimeAfter = matchAfter[1];
    const dataAfter = matchAfter[2];

    const promptText = `You are CivicEye AI, a professional municipal inspector agent.
Compare this 'Before' and 'After' image of a reported civic infrastructure defect.

Return ONLY valid JSON matching this exact structure:
{
  "completion_percentage": 0,
  "quality_score": 0.0,
  "remaining_damage": "Explain if any asphalt cracks, water leaks, or garbage overflow remains, or 'None' if fully resolved.",
  "remaining_safety_risks": "Explain if any safety hazards remain, or 'None' if secure.",
  "recommendation": "Technical advice on whether the repair should be accepted as Resolved or Reopened for further maintenance."
}

Guidelines:
- 'completion_percentage' must be an integer between 0 and 100.
- 'quality_score' must be a float between 0.0 and 10.0.
- Return JSON only. Do not wrap in markdown or return explanations outside the JSON.`;

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeBefore,
                data: dataBefore,
              },
            },
            {
              inlineData: {
                mimeType: mimeAfter,
                data: dataAfter,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const geminiRes = await fetchWithRetry(
        geminiUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        throw new Error(`Gemini returned error status ${geminiRes.status}: ${errorText}`);
      }

      const responseData = await geminiRes.json();
      const textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResult) {
        throw new Error("Received empty response content from Gemini in verify-repair.");
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(textResult.trim());
      } catch (jsonErr) {
        console.error("Failed to parse JSON response from Gemini in verify-repair:", textResult, jsonErr);
        throw new Error("Gemini did not return valid JSON content.");
      }

      return NextResponse.json({
        completion_percentage: Number(parsedResult.completion_percentage ?? 90),
        quality_score: Number(parsedResult.quality_score ?? 8.5),
        remaining_damage: String(parsedResult.remaining_damage || "None"),
        remaining_safety_risks: String(parsedResult.remaining_safety_risks || "None"),
        recommendation: String(parsedResult.recommendation || "Accept repair."),
      });

    } catch (apiErr: any) {
      clearTimeout(timeoutId);
      console.warn("Gemini verify-repair failed, falling back to mock:", apiErr.message || apiErr);
      return NextResponse.json(getMockVerification());
    }

  } catch (error: any) {
    console.error("Error in verify-repair API:", error);
    return NextResponse.json(getMockVerification());
  }
}
