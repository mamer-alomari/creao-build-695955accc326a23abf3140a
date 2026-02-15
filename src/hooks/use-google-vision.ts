/**
 * Google Vision API Hook (Gemini)
 *
 * Provides integration with the Google Generative AI API (Gemini) for image recognition
 * and inventory item detection.
 */

import { useMutation } from "@tanstack/react-query";
import { validateDetectedItems, type DetectedItem as AIResponseItem } from "../lib/schemas";

// Constants from the original file to maintain compatibility
export const ROOM_TYPES = [
    { value: "living_room", label: "Living Room" },
    { value: "bedroom", label: "Bedroom" },
    { value: "master_bedroom", label: "Master Bedroom" },
    { value: "kitchen", label: "Kitchen" },
    { value: "dining_room", label: "Dining Room" },
    { value: "bathroom", label: "Bathroom" },
    { value: "home_office", label: "Home Office" },
    { value: "garage", label: "Garage" },
    { value: "basement", label: "Basement" },
    { value: "attic", label: "Attic" },
    { value: "laundry_room", label: "Laundry Room" },
    { value: "kids_room", label: "Kids Room" },
    { value: "guest_room", label: "Guest Room" },
    { value: "storage", label: "Storage Area" },
    { value: "outdoor", label: "Outdoor/Patio" },
    { value: "other", label: "Other" },
] as const;

export const ITEM_CATEGORIES = [
    { value: "furniture", label: "Furniture" },
    { value: "electronics", label: "Electronics" },
    { value: "appliances", label: "Appliances" },
    { value: "decor", label: "Decor" },
    { value: "storage", label: "Storage" },
    { value: "bedding", label: "Bedding" },
    { value: "kitchenware", label: "Kitchenware" },
    { value: "clothing", label: "Clothing" },
    { value: "books_media", label: "Books & Media" },
    { value: "sports_outdoor", label: "Sports & Outdoor" },
    { value: "fragile", label: "Fragile Items" },
    { value: "other", label: "Other" },
] as const;

/**
 * Detected item from image analysis
 */
export type DetectedItem = AIResponseItem & {
    id: string;
};

/**
 * Room inventory with detected items
 */
export interface RoomInventory {
    roomName: string;
    roomType: string;
    imageUrl?: string;
    items: DetectedItem[];
    totalItems: number;
    analyzedAt: string;
}

/**
 * Convert a File to a base64 string for API submission
 */
export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64String = reader.result.split(",")[1];
                resolve(base64String);
            } else {
                reject(new Error("Failed to read file as base64"));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * Convert a data URL to base64 string
 */
function dataUrlToBase64(dataUrl: string): string {
    return dataUrl.split(",")[1];
}

interface GeminiPart {
    text?: string;
    inline_data?: {
        mime_type: string;
        data: string;
    };
}

// Valid room types for security validation
const VALID_ROOM_TYPES = ROOM_TYPES.map(rt => rt.value);

/**
 * Validate and sanitize room type to prevent prompt injection
 */
function validateRoomType(roomType: string): string {
    // Normalize input
    const normalized = roomType.toLowerCase().trim().replace(/\s+/g, '_');

    // Check if valid room type
    if (!VALID_ROOM_TYPES.includes(normalized as any)) {
        throw new Error(
            `Invalid room type: "${roomType}". Must be one of: ${ROOM_TYPES.map(rt => rt.label).join(', ')}`
        );
    }

    // Return the label for display in prompt
    const roomTypeObj = ROOM_TYPES.find(rt => rt.value === normalized);
    return roomTypeObj?.label || normalized;
}

/**
 * Analyze an image to detect movable items using Gemini
 */
export async function analyzeImageForItems(base64Image: string, roomType: string): Promise<DetectedItem[]> {
    // Prefer specific Vision key, fallback to Maps key for backward compatibility
    const apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        throw new Error("Google Vision API Key (or Maps Key fallback) is missing");
    }

    // Validate room type to prevent prompt injection attacks
    const validatedRoomType = validateRoomType(roomType);

    const prompt = `You are an expert moving company inventory specialist. Analyze this image of a ${validatedRoomType} and identify all movable items that would need to be packed and transported during a home move.

For each item you identify, provide the following information in a valid JSON array format:
- name: The common name of the item
- category: One of these categories: "furniture", "electronics", "appliances", "decor", "storage", "bedding", "kitchenware", "clothing", "books_media", "sports_outdoor", "fragile", "other"
- quantity: How many of this item you can see (estimate if multiple similar items)
- description: Brief description if helpful
- estimatedSize: One of "small" (fits in a box), "medium" (needs 2 people), "large" (needs 3+ people), "extra-large" (may need special equipment)
- estimatedWeight: One of "light" (under 20 lbs), "medium" (20-50 lbs), "heavy" (over 50 lbs)
- fragile: true if the item is breakable or needs special care
- specialHandling: Any special notes for movers (e.g., "disassembly required", "keep upright", "temperature sensitive")

IMPORTANT: Return ONLY a valid JSON array with the items. No additional text, explanation, or markdown. Start with [ and end with ].

Example format:
[
  {
    "name": "Sofa",
    "category": "furniture",
    "quantity": 1,
    "description": "3-seater sectional sofa",
    "estimatedSize": "large",
    "estimatedWeight": "heavy",
    "fragile": false,
    "specialHandling": "may require disassembly for narrow doorways"
  }
]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg", // Assuming JPEG, but Gemini is flexible
                            data: base64Image,
                        },
                    },
                ],
            },
        ],
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
        throw new Error("No response content from Gemini API");
    }

    const content = data.candidates[0].content.parts[0].text;

    // Parse the JSON response
    try {
        // Clean up potential markdown code blocks
        const cleanedContent = content.replace(/```json\n|\n```/g, "").replace(/```/g, "").trim();

        // Find the JSON array start and end
        const jsonStartIndex = cleanedContent.indexOf('[');
        const jsonEndIndex = cleanedContent.lastIndexOf(']') + 1;

        if (jsonStartIndex === -1 || jsonEndIndex === 0) {
            throw new Error("No JSON array found in response");
        }

        const jsonString = cleanedContent.substring(jsonStartIndex, jsonEndIndex);
        const parsed = JSON.parse(jsonString);

        // Validate with Zod schema
        const validatedItems = validateDetectedItems(parsed);

        // Add unique IDs to each validated item
        // Add unique IDs to each validated item
        return validatedItems.map((item: AIResponseItem, index: number) => ({
            ...item,
            id: `item-${Date.now()}-${index}`,
        }));
    } catch (parseError) {
        console.error("Failed to parse or validate Gemini response:", content);
        const errorMessage = parseError instanceof Error ? parseError.message : "Unknown error";
        throw new Error(`Failed to process detected items: ${errorMessage}`);
    }
}

/**
 * Helper to convert File to Data URL (for UI preview if needed) 
 * Re-exporting mainly for compatibility if used elsewhere, though we use base64 for API
 */
export async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("Failed to read file as data URL"));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * Hook for analyzing room images using Google Vision (Gemini)
 */
export function useAnalyzeRoomImage() {
    return useMutation({
        mutationFn: async ({
            imageFile,
            imageUrl,
            roomType,
        }: {
            imageFile?: File;
            imageUrl?: string;
            roomType: string;
        }): Promise<DetectedItem[]> => {
            let base64Image = "";

            if (imageFile) {
                base64Image = await fileToBase64(imageFile);
            } else if (imageUrl) {
                // If it's a data URL, strip the prefix
                if (imageUrl.startsWith("data:")) {
                    base64Image = dataUrlToBase64(imageUrl);
                } else {
                    // If it's a remote URL, we can't easily fetch it client-side due to CORS to send as base64 
                    // unless we have a proxy or Gemini supports URL directly (which it does not for public URLs in this endpoint easily without File API).
                    // For now, assume it's data URL or file. 
                    // If it is a remote URL, we might fail here. But the app mostly uses uploaded files.
                    throw new Error("Remote URL analysis not implemented for client-side Gemini yet. Please upload a file.");
                }
            }

            if (!base64Image) {
                throw new Error("No image data available for analysis");
            }

            return analyzeImageForItems(base64Image, roomType);
        },
    });
}
