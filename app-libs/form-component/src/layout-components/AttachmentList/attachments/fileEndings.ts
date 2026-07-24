export function getFileEnding(filename: string | undefined): string {
  if (!filename) {
    return '';
  }
  const split: string[] = filename.split('.');
  if (split.length === 1) {
    return '';
  }
  const ending: string = `.${split.at(-1)}`;
  return ending.toLowerCase();
}

export function removeFileEnding(filename: string | undefined): string {
  if (!filename) {
    return '';
  }
  const split: string[] = filename.split('.');
  if (split.length === 1) {
    return filename;
  }
  return filename.replace(`.${split.at(-1)}`, '');
}
