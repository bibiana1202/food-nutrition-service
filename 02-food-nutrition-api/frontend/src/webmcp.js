import { api } from './api';
function registerFoodDetailsTool(open) {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: 'open_food_details',
          description:
            '\uC2DD\uD488 ID\uB85C \uCD5C\uC2E0 \uC815\uBCF4\uB97C \uC870\uD68C\uD558\uACE0 \uD654\uBA74\uC758 \uC0C1\uC138 \uCC3D\uC744 \uC5FD\uB2C8\uB2E4. \uB370\uC774\uD130\uB97C \uC218\uC815\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
          inputSchema: {
            type: 'object',
            properties: { id: { type: 'integer', minimum: 1 } },
            required: ['id'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          async execute(input) {
            if (
              !input ||
              typeof input !== 'object' ||
              Object.keys(input).length !== 1 ||
              !('id' in input) ||
              !Number.isSafeInteger(input.id) ||
              Number(input.id) < 1
            )
              throw new Error('id must be a positive safe integer');
            const food = await api(`/api/foods/${input.id}`, { signal: lifecycle.signal });
            open(food);
            return { id: food.id, food_name: food.food_name, opened: true };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {}
  return () => lifecycle.abort();
}
export { registerFoodDetailsTool };
