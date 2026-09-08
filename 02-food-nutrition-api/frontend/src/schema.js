import { z } from 'zod';

export const nutrientFields = [
  'serving_size',
  'calorie',
  'carbohydrate',
  'protein',
  'fat',
  'sugars',
  'sodium',
  'cholesterol',
  'saturated_fatty_acids',
  'trans_fat',
];
const nutrient = z.number().finite().min(0).max(1e12).nullable().optional();
const optionalText = (max) => z.string().trim().max(max).nullable().optional();
export const foodCreateSchema = z
  .object({
    food_cd: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(64)
      .regex(/^[A-Z0-9][A-Z0-9_-]*$/),
    food_name: z.string().trim().min(1).max(300),
    group_name: optionalText(300),
    research_year: z.number().int().min(1900).max(2100).nullable().optional(),
    maker_name: optionalText(300),
    ref_name: optionalText(1000),
    source_notes: optionalText(1000),
    serving_unit: z.enum(['g', 'mL']).nullable().optional(),
    ...Object.fromEntries(nutrientFields.map((field) => [field, nutrient])),
  })
  .strict();
