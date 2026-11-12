export type Override<Primary, Secondary> = Primary & Omit<Secondary, keyof Primary>;
