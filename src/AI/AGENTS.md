# Instructions for AI projects

## Context

The `/AI` folder contains three projects:

| Project         | Description                                                                      | Path                |
| --------------- | -------------------------------------------------------------------------------- | ------------------- |
| Altinity agents | Agent service that enables users to develop apps with natural language           | `./agents`          |
| MCP server      | Altinn App tools, used by Altinity and developers working directly with app code | `./mcp`             |
| Augmenter agent | Augments caseworker workflow with LLM support                                    | `./augmenter-agent` |

These are all R&D projects from the AI lab, that will later be handed off to the Altinn Studio team.

See each project's README for setup and architecture details.

## Priorities when coding

1. Security
2. Avoiding bugs
3. Performance and avoiding resource leaks
4. Good architecture decisions

## Code conventions

Prefer working software over perfect software, but the principles below should generally be followed **when writing new code**.

### Single Responsibility Principle (SRP)

Each function should generally do one thing. Minimize nested conditionals and loops.

**Too many responsibilities:**

```typescript
function processOrder(order: Order) {
  // validates, calculates total, applies discount, saves to DB, sends email
  // ... 50 lines doing all of these things
}
```

**Separated by responsibility:**

```typescript
function processOrder(order: Order) {
  const validatedOrder = validateOrder(order);
  const pricedOrder = calculateTotal(validatedOrder);
  const discountedOrder = applyDiscount(pricedOrder);
  saveOrder(discountedOrder);
  sendOrderConfirmation(discountedOrder);
}
```

### Naming

- **Functions use verbs**: `fetchUserProfile`, `calculateTotal`.
- **Boolean-returning functions are questions** — prefix with `is`, `has`, `should`, `are`: `isValid`, `hasPermission`.
- **Include units** for numeric values: `debounceTimeInMilliseconds`, `maxRetryCount`.
- **Long and precise beats short and vague** — a long name may signal unclear responsibility, but it's still better than an ambiguous one.
- **Use snake case for Python** — e.g. `fetch_user_profile`, not `fetchUserProfile`.

### No magic values

Hardcoded numbers and strings (other than `0`, `1`, `""`) should be assigned to descriptively named constants. Exception: when the type system makes the value self-documenting — e.g., `mode === 'edit'` when `mode` is typed as `'edit' | 'read'`.
