import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';

export const capitalizeName = (name: string) =>
  name
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

export const getPlainTextFromNode = (node: ReactNode): string => {
  if (typeof node === 'string') {
    return node;
  }
  if (isValidElement(node)) {
    let text = '';
    Children.forEach(node.props.children, (child) => {
      text += getPlainTextFromNode(child);
    });
    return text;
  }
  return '';
};

export function duplicateStringFilter(currentString: string, currentIndex: number, strings: string[]): boolean {
  for (let i = 0; i < currentIndex; i++) {
    if (currentString === strings[i]) {
      return false;
    }
  }
  return true;
}
