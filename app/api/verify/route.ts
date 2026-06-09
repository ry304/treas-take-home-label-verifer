import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REQUIRED_GOV_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY in server environment" }, { status: 500 });
    }

    const body = await req.json();
    const { application, images } = body || {};

    const content: any[] = [];

    if (Array.isArray(images)) {
      images.forEach((img: string) => {
        const matches = img.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          content.push({
            type: "image",
            source: { type: "base64", media_type: matches[1], data: matches[2] },
          });
        }
      });
    }

    content.push({
      type: "text",
      text: `You are an expert TTB label verification assistant. Inspect the provided label image(s) and determine whether each required field appears on the label and matches the application data.

Return ONLY a JSON object with these keys: brandName, classType, alcoholContent, netContents, bottlerNameAddress, countryOfOrigin, governmentWarning.
Each value must be: { "pass": true or false, "text": "brief explanation" }

The government warning must exactly match this required text (case and punctuation):
${REQUIRED_GOV_WARNING}

Application data:
${JSON.stringify(application || {})}

Return only the JSON object, no other text.`,
    });

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        messages: [{ role: "user", content }],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: text }, { status: resp.status });
    }

    const data = await resp.json();
    const output = data.content?.[0]?.text || "";

    try {
      const clean = output.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return NextResponse.json({ result: parsed });
    } catch {
      return NextResponse.json({ raw: output });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
