import React, { useState } from 'react';
import { TextTableRowEntry, UpsertTextResourceMutation } from './types';
import { TextArea } from '@digdir/design-system-react';
import { Variables } from './Variables';

export interface TextEntryProps extends TextTableRowEntry {
  textId: string;
  upsertTextResource: (data: UpsertTextResourceMutation) => void;
}

export const TextEntry = ({ textId, lang, translation, upsertTextResource }: TextEntryProps) => {
  const [textEntryValue, setTextEntryValue] = useState(translation);
  const variables = [];
  const handleTextEntryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setTextEntryValue(e.currentTarget.value);

  const handleTextEntryBlur = () =>
    upsertTextResource({ language: lang, translation: textEntryValue, textId });

  return (
    <>
      <TextArea
        aria-label={lang + ' translation'}
        value={textEntryValue}
        onBlur={handleTextEntryBlur}
        onChange={handleTextEntryChange}
        resize={'vertical'}
        rows={2}
      />
      <Variables variables={variables} />
    </>
  );
};
