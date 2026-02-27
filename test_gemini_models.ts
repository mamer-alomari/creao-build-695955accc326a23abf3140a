import dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function listModels() {
    const apiKey = process.env.VITE_GOOGLE_VISION_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const models = data.models.map((m: any) => m.name);
        console.log("Available models:", models.filter((m: string) => m.includes("gemini")));
    } catch (e: any) {
        console.error("Fetch threw:", e.message);
    }
}

listModels();
