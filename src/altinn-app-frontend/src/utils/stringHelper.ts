export const capitalizeName: (name: string) => string = (name: string) => {
  return name
    .toLowerCase()
    .split(' ')
    .map((str: string) => [str.split('')[0].toUpperCase(), str.substring(1)].join(''))
    .join(' ')
    .trim();
};
