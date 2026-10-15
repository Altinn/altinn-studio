# Coding conventions

These conventions apply to new code in `src/AI`. Working software comes before perfect software, so follow them
in general rather than without exception.

## Responsibilities

Each function does one thing. Keep nested conditionals and loops to a minimum.

```typescript
// Too many responsibilities
function processOrder(order: Order) {
  // validates, calculates the total, applies a discount, saves to the database and sends an email
}

// One responsibility each
function processOrder(order: Order) {
  const validatedOrder = validateOrder(order);
  const pricedOrder = calculateTotal(validatedOrder);
  const discountedOrder = applyDiscount(pricedOrder);
  saveOrder(discountedOrder);
  sendOrderConfirmation(discountedOrder);
}
```

## Names

- Functions use verbs, such as `fetchUserProfile` and `calculateTotal`.
- Functions that return a boolean are questions, starting with `is`, `has`, `should` or `are`, such as `isValid`.
- Numeric names include the unit, such as `debounceTimeInMilliseconds`.
- A long, precise name is better than a short, vague one, even when the length hints at unclear responsibility.
- Python uses snake case, such as `fetch_user_profile`.

## Constants

Assign hard-coded numbers and strings, other than `0`, `1` and `""`, to constants with descriptive names. A value
can stay inline when its type makes it self-documenting, such as `mode === 'edit'` when `mode` is
`'edit' | 'read'`.

## Python checks

Every `# noqa`, `# pyright: ignore` and ignored rule in the [Ruff and Pyright configuration](../assistant/pyproject.toml)
has a comment that gives the reason.
