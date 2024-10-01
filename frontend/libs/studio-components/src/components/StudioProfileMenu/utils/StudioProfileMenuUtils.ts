export const getTruncatedText = (text: string, truncateAt?: number): string => {
  if (!text) return '';

  if (truncateAt && text.length > truncateAt) {
    return `${text.slice(0, truncateAt)}...`;
  }

  return text;
};
