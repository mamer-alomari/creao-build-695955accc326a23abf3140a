import dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function test() {
    console.log("Starting direct API test");
    const apiKey = process.env.VITE_GOOGLE_VISION_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const prompt = `You are an expert moving company inventory specialist. Analyze this image of a living room and identify all movable items that would need to be packed and transported during a home move.

For each item you identify, provide the following information in a valid JSON array format:
- name: The common name of the item
- category: One of these categories: "furniture", "electronics", "appliances", "decor", "storage", "bedding", "kitchenware", "clothing", "books_media", "sports_outdoor", "fragile", "other"
- quantity: How many of this item you can see (estimate if multiple similar items)
- description: Brief description if helpful
- estimatedSize: One of "small" (fits in a box), "medium" (needs 2 people), "large" (needs 3+ people), "extra-large" (may need special equipment)
- estimatedWeight: One of "light" (under 20 lbs), "medium" (20-50 lbs), "heavy" (over 50 lbs)
- fragile: true if the item is breakable or needs special care
- specialHandling: Any special notes for movers (e.g., "disassembly required", "keep upright", "temperature sensitive")

IMPORTANT: Return ONLY a valid JSON array with the items. No additional text, explanation, or markdown. Start with [ and end with ].`;

    const dummyImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "image/png", data: dummyImage } },
                ],
            },
        ],
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            console.error("API error:", await response.text());
            return;
        }

        const data = await response.json();
        const content = data.candidates[0]?.content?.parts[0]?.text;
        console.log("Raw response content:", content);

        let cleanedContent = content.trim();
        if (cleanedContent.startsWith("```json")) {
            cleanedContent = cleanedContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        } else if (cleanedContent.startsWith("```")) {
            cleanedContent = cleanedContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
        }

        cleanedContent = cleanedContent.trim();
        console.log("Cleaned:", cleanedContent);
    } catch (e: any) {
        console.error("Fetch threw:", e.message);
    }
}

test();
