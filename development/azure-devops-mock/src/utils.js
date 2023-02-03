export const between = (min, max) => Math.floor(Math.random() * (max - min) + min);
export const sleep = (timeout) => new Promise((r) => setTimeout(r, timeout));
export const designerDomain = () => 'http://' + (process.env.DESIGNER_HOST ?? 'studio.localhost');
