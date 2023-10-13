import React, { useState } from 'react';
import { TextTableRowEntry, UpsertTextResourceMutation } from './types';
import { LegacyTextArea } from '@digdir/design-system-react';
import { Variables } from './Variables';
import { useAutoSizeTextArea } from './hooks/useAutoSizeTextArea';

export interface TextEntryProps extends TextTableRowEntry {
  textId: string;
  upsertTextResource: (data: UpsertTextResourceMutation) => void;
  className?: string;
}

export const TextEntry = ({
  textId,
  lang,
  translation,
  upsertTextResource,
  className,
}: TextEntryProps) => {
  const [textEntryValue, setTextEntryValue] = useState(translation);
  const textareaRef = useAutoSizeTextArea(textEntryValue);

  const variables = [];

  const handleTextEntryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setTextEntryValue(e.currentTarget.value);

  const handleTextEntryBlur = () =>
    upsertTextResource({ language: lang, translation: textEntryValue, textId });

  return (
    <div className={className}>
      <LegacyTextArea
        aria-label={lang + ' translation'}
        value={textEntryValue}
        onBlur={handleTextEntryBlur}
        onChange={handleTextEntryChange}
        ref={textareaRef}
        resize={'vertical'}
      />
      <Variables variables={variables} />
    </div>
  );
};
