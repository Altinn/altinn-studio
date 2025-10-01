/**
 * Converts dot-notation to JsonPointer (including support for repeating groups)
 */
export function dotNotationToPointer(path: string): string {
  return `/${path.replace(/\./g, '/')}`.replace(/\[(\d+)]\//g, (...a) => `/${a[1]}/`);
}

/**
 * Converts JsonPointer to dot-notation (including support for repeating groups)
 */
export function pointerToDotNotation(path: string): string {
  const newPath: string[] = [];

  for (const part of path.split('/')) {
    if (part === '') {
      continue;
    }

    if (part.match(/^\d+$/) && newPath.length > 0) {
      const lastPart = newPath[newPath.length - 1];
      newPath[newPath.length - 1] = `${lastPart}[${part}]`;
    } else {
      newPath.push(part);
    }
  }

  return newPath.join('.');
}
