import classes from './TextEditor.module.css';
import { TextRow } from './TextRow';
import React, { useEffect } from 'react';
import type {
  TextResourceEntry,
  TextResourceEntryDeletion,
  TextResourceIdMutation,
  TextResourceMap,
} from './types';
import { filterFunction, getLangName } from './utils';

export type TextListProps = {
  textIds: string[];
  selectedLangCode: string;
  searchQuery: string;
  texts: TextResourceMap;
  upsertEntry: (entry: TextResourceEntry) => void;
  removeEntry: ({ textId }: TextResourceEntryDeletion) => void;
  updateEntryId: ({ oldId, newId }: TextResourceIdMutation) => void;
};
export const TextList = ({
  textIds,
  selectedLangCode,
  searchQuery,
  texts,
  ...rest
}: TextListProps) => {
  const langName = getLangName({ code: selectedLangCode });

  const idExits = (textId: string, textEntryValue: string): boolean => {
    const isSameField = texts[textId]?.value === textEntryValue;

    // combined textId with text-value to decide whether the key exists or not.
    return textIds.includes(textId) && !isSameField;
  };

  return (
    <ul className={classes.TextEditor__body}>
      {textIds
        .filter((id) => filterFunction(id, texts[id] ? texts[id].value : '', searchQuery))
        .map((id) => (
          <TextRow
            key={`${selectedLangCode}.${id}`}
            textId={id}
            langName={langName}
            idExists={(textId) => idExits(textId, texts[id]?.value)}
            textData={texts[id]}
            {...rest}
          />
        ))}
    </ul>
  );
};
