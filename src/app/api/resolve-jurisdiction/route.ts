import { NextResponse } from "next/server";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getMockJurisdiction(city: string, state: string, locality: string): string {
  const cityLower = (city || "").toLowerCase().trim();
  const stateLower = (state || "").toLowerCase().trim();
  const locLower = (locality || "").toLowerCase().trim();

  if (cityLower.includes("chennai") || locLower.includes("chennai")) {
    return "Greater Chennai Corporation - Adyar Zone";
  }
  if (cityLower.includes("hyderabad") || locLower.includes("hyderabad") || locLower.includes("secunderabad")) {
    return "Greater Hyderabad Municipal Corporation - Jubilee Hills Zone";
  }
  if (cityLower.includes("mumbai") || locLower.includes("mumbai") || cityLower.includes("bombay")) {
    return "Municipal Corporation of Greater Mumbai - Ward A";
  }
  if (cityLower.includes("delhi") || locLower.includes("delhi") || locLower.includes("ncr")) {
    return "Municipal Corporation of Delhi - Central Zone";
  }
  if (cityLower.includes("pune") || locLower.includes("pune")) {
    return "Pune Municipal Corporation - Kothrud Zone";
  }
  if (cityLower.includes("salem") || locLower.includes("salem")) {
    return "Salem City Municipal Corporation - Central Division";
  }
  if (cityLower.includes("kolkata") || locLower.includes("kolkata") || cityLower.includes("calcutta")) {
    return "Kolkata Municipal Corporation - Borough VII";
  }
  if (cityLower.includes("kochi") || cityLower.includes("cochin") || locLower.includes("kochi")) {
    return "Kochi Municipal Corporation - Central Zone";
  }

  // Fallback for other locations
  const resolvedCity = city || "Local";
  const resolvedState = state || "India";
  return `${resolvedCity} Municipal Corporation - ${resolvedState}`;
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
        console.warn(`Gemini API returned 503 in resolve-jurisdiction. Retrying...`);
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
  throw lastError || new Error("Gemini max retries reached in resolve-jurisdiction.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { locality, city, state, postcode, formattedAddress } = body;

    const testMode = process.env.TEST_MODE !== "false";
    const apiKey = process.env.GEMINI_API_KEY;

    if (testMode || !apiKey) {
      console.log(`resolve-jurisdiction running in simulated mode. City: ${city}`);
      return NextResponse.json({
        jurisdiction: getMockJurisdiction(city, state, locality)
      });
    }

    const promptText = `You are a municipal geography expert for India.
Given the following geocoded address details:
- Locality/Sub-locality: ${locality || "Unknown"}
- City/Town/Village: ${city || "Unknown"}
- State: ${state || "Unknown"}
- Postal Code: ${postcode || "Unknown"}
- Full Address: ${formattedAddress || "Unknown"}

Infer the appropriate local civic jurisdiction in India.
Select the correct municipal authority type (e.g., Municipal Corporation, Municipal Council, Nagar Panchayat, Cantonment Board) and the nearest local administrative area/zone/ward/division if possible.

Format the output as a single clean string in this exact format:
[Civic Authority] - [Administrative Zone/Ward/Area]

Example outputs:
- Greater Chennai Corporation - Adyar Zone
- Municipal Corporation of Delhi - South Zone (Ward 142)
- Pune Municipal Corporation - Kothrud Zone
- Kochi Municipal Corporation - Central Zone

Do NOT hallucinate. If you cannot confidently determine a specific ward or zone, return the Municipal Authority together with the city and state. Example: "Kochi Municipal Corporation - Kochi, Kerala".
Return ONLY the clean string. Do not include markdown code block wraps, and do not include extra explanations.`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }]
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const geminiRes = await fetchWithRetry(
        geminiUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        throw new Error(`Gemini returned error status ${geminiRes.status}`);
      }

      const responseData = await geminiRes.json();
      const textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResult) {
        throw new Error("Received empty response from Gemini.");
      }

      const cleanedResult = textResult.trim();
      return NextResponse.json({ jurisdiction: cleanedResult });
    } catch (apiErr: any) {
      clearTimeout(timeoutId);
      console.warn("Gemini resolve-jurisdiction failed, falling back to mock mapping:", apiErr.message || apiErr);
      return NextResponse.json({
        jurisdiction: getMockJurisdiction(city, state, locality)
      });
    }

  } catch (error: any) {
    console.error("Error in resolve-jurisdiction POST handler:", error);
    return NextResponse.json({
      jurisdiction: "Local Municipal Corporation - India"
    });
  }
}
