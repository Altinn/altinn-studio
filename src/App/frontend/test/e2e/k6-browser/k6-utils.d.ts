declare module 'https://jslib.k6.io/k6-utils/1.5.0/index.js' {
  export function check<T>(
    val: T,
    sets: { [key: string]: (val: T) => boolean | Promise<boolean> },
    tags?: { [key: string]: string },
  ): boolean;
}
