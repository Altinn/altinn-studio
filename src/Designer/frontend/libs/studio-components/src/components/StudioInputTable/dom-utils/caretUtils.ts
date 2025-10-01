export function isSomethingSelected(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  return element.selectionStart !== element.selectionEnd;
}

export function isCaretAtStart(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  return element.selectionStart === 0;
}

export function isCaretAtEnd(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  return element.selectionEnd === element.value.length;
}
