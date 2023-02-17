export function getLanguageFromKey(key: string, language: any) {
  if (!key) {
    return key;
  }
  return (language[key] || key) as string;
}
