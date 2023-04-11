import React, { useMemo } from 'react';
import { TextRow } from './TextRow';
import type {
  TextResourceEntryDeletion,
  TextResourceIdMutation,
  UpsertTextResourcesMutation,
} from './types';
import { filterFunction, getLangName } from './utils';
import { TextTableRow } from './types';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@digdir/design-system-react';

export type TextListProps = {
  resourceRows: TextTableRow[];
  searchQuery: string;
  upsertTextResource: (entry: UpsertTextResourcesMutation) => void;
  removeEntry: ({ textId }: TextResourceEntryDeletion) => void;
  updateEntryId: ({ oldId, newId }: TextResourceIdMutation) => void;
};
export const TextList = ({ resourceRows, searchQuery, ...rest }: TextListProps) => {
  const textIds = useMemo(() => resourceRows.map((row) => row.textKey), [resourceRows]);
  const idExists = (textId: string): boolean => textIds.includes(textId);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {resourceRows[0].translations.map((translation) => (
            <TableCell key={'header-lang' + translation.lang}>
              {getLangName({ code: translation.lang })}
            </TableCell>
          ))}
          <TableCell>Tekstnøkkel</TableCell>
          <TableCell>Variabler</TableCell>
          <TableCell></TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {resourceRows
          .filter((row) => filterFunction(row.textKey, row.translations, searchQuery))
          .map((row) => (
            <TextRow
              key={`${row.translations[0].lang}.${row.textKey}`}
              textId={row.textKey}
              idExists={idExists}
              textRowEntries={row.translations}
              variables={row.variables || []}
              {...rest}
            />
          ))}
      </TableBody>
    </Table>
  );
};
