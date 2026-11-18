import { createContext, useContext } from 'react';

export type TextEditing = {
  /** Saves an app text in the edited language. */
  saveText: (textKey: string, value: string) => void;
};

export const TextEditingContext = createContext<TextEditing | null>(null);

export function useTextEditing(): TextEditing {
  const context = useContext(TextEditingContext);
  if (!context) throw new Error('useTextEditing must be used within an EditorTranslatorProvider.');
  return context;
}
