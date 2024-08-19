export function isSomethingSelected(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  return element.selectionStart !== element.selectionEnd;
}

export function isCaretAtStart(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  return element.selectionStart === 0;
}

export function isCaretAtEnd(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  return element.selectionEnd === element.value.length;
}

export function isCaretAtFirstLine(element: HTMLTextAreaElement): boolean {
  const firstLineBreakIndex = element.value.indexOf('\n');
  if (firstLineBreakIndex === -1) return true;
  return element.selectionStart <= firstLineBreakIndex;
}

export function isCaretAtLastLine(element: HTMLTextAreaElement): boolean {
  const lastLineBreakIndex = element.value.lastIndexOf('\n');
  return element.selectionStart > lastLineBreakIndex;
}
