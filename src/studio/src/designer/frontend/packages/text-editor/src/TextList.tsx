import classes from './TextEditor.module.css';
import { TextRow } from './TextRow';
import React from 'react';
import type { TextResourceEntry, TextResourceMap } from './types';
import { getLangName } from './utils';

export type TextListProps = {
  textIds: string[];
  selectedLangCode: string;
  texts: TextResourceMap;
  upsertEntry: (entry: TextResourceEntry) => void;
  removeEntry: (entryId: string) => void;
  updateEntryId: (oldId: string, newId: string) => void;
};
export const TextList = ({
  textIds,
  selectedLangCode,
  texts,
  upsertEntry,
  removeEntry,
  updateEntryId,
}: TextListProps) => {
  const langName = getLangName({ code: selectedLangCode });

  const idExits = (entryId: string) => textIds.includes(entryId);
  return (
    <ul className={classes.TextEditor__body}>
      {textIds.map((id) => (
        <TextRow
          key={`${selectedLangCode}.${id}`}
          textId={id}
          langName={langName}
          langCode={selectedLangCode}
          textResourceEntry={texts[id]}
          idExists={idExits}
          upsertEntry={upsertEntry}
          removeEntry={removeEntry}
          updateEntryId={updateEntryId}
        />
      ))}
    </ul>
  );
};
