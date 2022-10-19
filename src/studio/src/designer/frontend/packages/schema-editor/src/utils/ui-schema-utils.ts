export const getDomFriendlyID = (input: string, suffix?: string): string =>
  input.replace(/\//g, '').replace('#', '') + (suffix ? '-' + suffix : '');

export const isValidName = (name: string) => Boolean(name.match(/^[a-zA-ZæÆøØåÅ][a-zA-Z0-9_.\-æÆøØåÅ ]*$/));

let unusedNumber = 0;

export const getUniqueNumber = () => unusedNumber++;
