export const between = (min, max) => Math.floor(Math.random() * (max - min) + min);
export const sleep = (timeout) => new Promise((r) => setTimeout(r, timeout));
