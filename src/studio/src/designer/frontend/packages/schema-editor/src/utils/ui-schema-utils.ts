export const getDomFriendlyID = (input: string, postfix?: string): string =>
  input.replace(/\//g, '').replace('#', '') + (postfix ? '-' + postfix : '');

export const isValidName = (name: string) => Boolean(name.match(/^[a-zA-ZæÆøØåÅ][a-zA-Z0-9_.\-æÆøØåÅ ]*$/));

let unusedNumber = 0;

export const getUniqueNumber = () => unusedNumber++;
