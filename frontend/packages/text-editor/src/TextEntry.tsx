import React, { useState } from 'react';
import { TextTableRowEntry, UpsertTextResourcesMutation } from './types';
import { TextField } from '@digdir/design-system-react';
import { Variables } from './Variables';

export interface TextEntryProps extends TextTableRowEntry {
  textId: string;
  upsertTextResource: (data: UpsertTextResourcesMutation) => void;
}

export const TextEntry = ({ textId, lang, translation, upsertTextResource }: TextEntryProps) => {
  const [textEntryValue, setTextEntryValue] = useState(translation);
  const variables = [];
  const handleTextEntryChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTextEntryValue(e.currentTarget.value);

  const handleTextEntryBlur = () =>
    upsertTextResource({ language: lang, translation: textEntryValue, textId });

  return (
    <>
      <TextField
        aria-label={lang + ' translation'}
        value={textEntryValue}
        onBlur={handleTextEntryBlur}
        onChange={handleTextEntryChange}
      />
      <Variables variables={variables} />
    </>
  );
};
