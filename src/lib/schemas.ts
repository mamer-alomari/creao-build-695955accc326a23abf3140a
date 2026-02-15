/**
 * Validation Schemas using Zod
 *
 * Runtime validation for critical data to prevent invalid data from entering the system
 */

import { z } from 'zod';

/**
 * Inventory Item Schema
 * Validates individual inventory items for jobs
 */
export const InventoryItemSchema = z.object({
	id: z.string().min(1, 'Item ID is required'),
	name: z.string().min(1, 'Item name is required').max(200, 'Item name too long'),
	quantity: z.number().int().positive('Quantity must be positive'),
	room: z.string().optional(),
	category: z.string().optional(),
	description: z.string().optional(),
	estimatedSize: z.enum(['small', 'medium', 'large', 'extra-large']).optional(),
	estimatedWeight: z.enum(['light', 'medium', 'heavy']).optional(),
	fragile: z.boolean().optional(),
	specialHandling: z.string().optional(),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

/**
 * Inventory Data Array Schema
 * Validates array of inventory items
 */
export const InventoryDataSchema = z.array(InventoryItemSchema).max(1000, 'Too many items');

/**
 * Company Name Schema
 * Validates company name with specific rules
 */
export const CompanyNameSchema = z
	.string()
	.min(3, 'Company name must be at least 3 characters')
	.max(100, 'Company name must be less than 100 characters')
	.regex(
		/^[a-zA-Z0-9\s\-&.,'"()]+$/,
		'Company name can only contain letters, numbers, spaces, and common punctuation'
	)
	.transform((val) => val.trim());

/**
 * Detected Item Schema (from Gemini AI)
 * Validates AI response structure for inventory detection
 */
export const DetectedItemSchema = z.object({
	name: z.string().min(1, 'Item name is required'),
	category: z.enum([
		'furniture',
		'electronics',
		'appliances',
		'decor',
		'storage',
		'bedding',
		'kitchenware',
		'clothing',
		'books_media',
		'sports_outdoor',
		'fragile',
		'other',
	]),
	quantity: z.number().int().positive('Quantity must be positive').max(1000, 'Quantity too high'),
	description: z.string().nullable().optional(),
	estimatedSize: z.enum(['small', 'medium', 'large', 'extra-large']).nullable().optional(),
	estimatedWeight: z.enum(['light', 'medium', 'heavy']).nullable().optional(),
	fragile: z.boolean().nullable().optional().default(false),
	specialHandling: z.string().nullable().optional(),
});

export type DetectedItem = z.infer<typeof DetectedItemSchema>;

/**
 * Detected Items Array Schema (from Gemini AI)
 */
export const DetectedItemsArraySchema = z
	.array(DetectedItemSchema)
	.min(1, 'At least one item must be detected')
	.max(100, 'Too many items detected');

/**
 * Quote Data Schema
 * Validates quote data before booking
 */
export const QuoteDataSchema = z.object({
	customer_id: z.string().optional(),
	customer_name: z.string().min(1, 'Customer name is required').trim(),
	company_id: z.string().optional(),
	move_date: z.string().min(1, 'Move date is required'),
	pickup_address: z.string().min(1, 'Pickup address is required').trim(),
	dropoff_address: z.string().min(1, 'Dropoff address is required').trim(),
	estimated_price_min: z.number().nonnegative('Price cannot be negative').optional(),
	estimated_price_max: z.number().nonnegative('Price cannot be negative').optional(),
	inventory_items: z.array(z.any()).optional(), // Flexible for now
});

/**
 * Validate inventory data JSON string
 * @param jsonString - JSON string containing inventory items
 * @returns Validated inventory items or throws error
 */
export function validateInventoryData(jsonString: string): InventoryItem[] {
	try {
		const parsed = JSON.parse(jsonString);
		return InventoryDataSchema.parse(parsed);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			throw new Error(`Invalid inventory data: ${messages}`);
		}
		throw new Error(`Failed to parse inventory data: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Validate company name
 * @param name - Company name to validate
 * @returns Validated and normalized company name or throws error
 */
export function validateCompanyName(name: string): string {
	try {
		return CompanyNameSchema.parse(name);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error(error.errors[0].message);
		}
		throw error;
	}
}

/**
 * Validate detected items from AI response
 * @param items - Items detected by AI
 * @returns Validated items or throws error
 */
export function validateDetectedItems(items: unknown): DetectedItem[] {
	try {
		return DetectedItemsArraySchema.parse(items);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			throw new Error(`Invalid detected items: ${messages}`);
		}
		throw error;
	}
}

/**
 * Safe parse - returns validation result without throwing
 * @param schema - Zod schema to use
 * @param data - Data to validate
 * @returns Validation result with success flag and data/errors
 */
export function safeParse<T extends z.ZodTypeAny>(
	schema: T,
	data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
	const result = schema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	return {
		success: false,
		errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
	};
}
