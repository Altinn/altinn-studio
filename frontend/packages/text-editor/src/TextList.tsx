import React, { useMemo } from 'react';
import { TextRow } from './TextRow';
import type {
  TextResourceEntryDeletion,
  TextResourceIdMutation,
  UpsertTextResourceMutation,
} from './types';
import { filterFunction, getLangName } from './utils';
import type { TextTableRow } from './types';
import {
  LegacyTable,
  LegacyTableBody,
  LegacyTableCell,
  LegacyTableHeader,
  LegacyTableRow,
} from '@digdir/design-system-react';
import { APP_NAME } from 'app-shared/constants';

export type TextListProps = {
  resourceRows: TextTableRow[];
  searchQuery: string;
  selectedLanguages: string[];
  upsertTextResource: (entry: UpsertTextResourceMutation) => void;
  removeEntry: ({ textId }: TextResourceEntryDeletion) => void;
  updateEntryId: ({ oldId, newId }: TextResourceIdMutation) => void;
};
export const TextList = ({
  resourceRows,
  searchQuery,
  selectedLanguages,
  ...rest
}: TextListProps) => {
  const textIds = useMemo(() => resourceRows.map((row) => row.textKey), [resourceRows]);
  const idExists = (textId: string): boolean => textIds.includes(textId);
  const getTableHeaderCellId = (language: string): string => `header-lang${language}`;

  return (
    <LegacyTable>
      <LegacyTableHeader>
        <LegacyTableRow>
          <LegacyTableCell />
          {selectedLanguages.map((language) => (
            <LegacyTableCell
              id={getTableHeaderCellId(language)}
              key={getTableHeaderCellId(language)}
            >
              {getLangName({ code: language })}
            </LegacyTableCell>
          ))}
          <LegacyTableCell>Tekstnøkkel</LegacyTableCell>
          <LegacyTableCell>Variabler</LegacyTableCell>
        </LegacyTableRow>
      </LegacyTableHeader>
      <LegacyTableBody>
        {resourceRows
          .filter((row) => filterFunction(row.textKey, row.translations, searchQuery))
          .map((row) => (
            <TextRow
              key={`${row.translations[0].lang}.${row.textKey}`}
              textId={row.textKey}
              idExists={idExists}
              textRowEntries={row.translations}
              variables={row.variables || []}
              selectedLanguages={selectedLanguages}
              showButton={row.textKey !== APP_NAME}
              {...rest}
            />
          ))}
      </LegacyTableBody>
    </LegacyTable>
  );
};
