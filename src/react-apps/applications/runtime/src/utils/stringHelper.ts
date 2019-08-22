export const capitalizeName: (name: string) => string = (name: string) => {
  return name.toLowerCase().split(' ').map((str: string) => str.charAt(0).toUpperCase()).join(' ').trim();
};
