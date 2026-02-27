import { analyzeImageForItems } from "./src/hooks/use-google-vision";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// Mock import.meta.env for Node.js
(global as any).import = { meta: { env: process.env } };

async function test() {
    // Create a dummy image base64
    // 1x1 black pixel base64
    const dummyImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    try {
        console.log("Starting analysis...");
        const result = await analyzeImageForItems(dummyImage, "image/png", "living_room");
        console.log("Result:", result);
    } catch (e: any) {
        console.error("Error occurred:");
        console.error(e.message);
        if (e.response) {
            console.error(e.response.data);
        }
    }
}

test();
