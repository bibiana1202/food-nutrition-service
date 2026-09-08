const { z } = require('zod');

const nutrientFields = [
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

const foodCreateSchema = z
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

const foodPatchSchema = foodCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, '수정할 항목을 하나 이상 입력해주세요.');

const positiveIntegerString = (max) =>
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().max(max));
const searchSchema = z
  .object({
    food_name: z.string().trim().min(1).max(300).optional(),
    research_year: positiveIntegerString(2100).pipe(z.number().min(1900)).optional(),
    maker_name: z.string().trim().min(1).max(300).optional(),
    food_code: z.string().trim().toUpperCase().min(1).max(64).optional(),
    page: positiveIntegerString(10000).default(1),
    page_size: positiveIntegerString(100).default(20),
  })
  .strict();

const idSchema = positiveIntegerString(Number.MAX_SAFE_INTEGER);

module.exports = { foodCreateSchema, foodPatchSchema, idSchema, nutrientFields, searchSchema };
