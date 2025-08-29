/**
 * @deprecated Use `Override` from `@studio/components` instead.
 */
export type Override<Primary, Secondary> = Primary & Omit<Secondary, keyof Primary>;
