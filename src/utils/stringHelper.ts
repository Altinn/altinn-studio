export const capitalizeName = (name: string) => {
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => !!word)
    .map((word) => {
      const firstLetter = word[0];
      const rest = word.substring(1);

      if (firstLetter && rest) {
        return firstLetter.toUpperCase() + rest;
      }

      return word;
    })
    .join(' ')
    .trim();
};
