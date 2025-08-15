import React, { useMemo } from 'react';
import { TextRow } from './TextRow';
import type { TextResourceEntryDeletion, TextResourceIdMutation, TextTableRow } from './types';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { filterFunction, getLangName } from './utils';
import classes from './TextList.module.css';
import { useTranslation } from 'react-i18next';
import { APP_NAME } from 'app-shared/constants';
import { useLayoutNamesQuery } from './hooks/useLayoutNamesQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Table } from '@digdir/designsystemet-react';
import { StringUtils } from '@studio/pure-functions';

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
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: layoutNames, isPending: layoutNamesPending } = useLayoutNamesQuery(org, app);

  const getTableHeaderCellId = (language: string): string => `header-lang${language}`;
  const textIds = useMemo(() => resourceRows.map((row) => row.textKey), [resourceRows]);
  const idExists = (newTextId: string, oldTextId: string): boolean =>
    textIds
      .filter((textId: string) => textId.toLowerCase() !== oldTextId.toLowerCase())
      .some((textId: string) => StringUtils.areCaseInsensitiveEqual(textId, newTextId));

  return (
    <Table className={classes.textListTable}>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell />
          {selectedLanguages.map((language) => (
            <Table.HeaderCell
              id={getTableHeaderCellId(language)}
              key={getTableHeaderCellId(language)}
            >
              {getLangName({ code: language })}
            </Table.HeaderCell>
          ))}
          <Table.HeaderCell>{t('text_editor.table_header_text_key')}</Table.HeaderCell>
          <Table.HeaderCell>{t('text_editor.table_header_variables')}</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {resourceRows
          .filter((row) =>
            filterFunction({
              entry: { id: row.textKey, translations: row.translations },
              searchString: searchQuery,
            }),
          )
          .map((row) => {
            const keyIsAppName = row.textKey === APP_NAME;
            const keyIsLayoutName = !layoutNamesPending && layoutNames.includes(row.textKey);
            return (
              <TextRow
                key={`${row.translations[0].lang}.${row.textKey}`}
                textId={row.textKey}
                idExists={idExists}
                textRowEntries={row.translations}
                variables={row.variables || []}
                selectedLanguages={selectedLanguages}
                showDeleteButton={!keyIsAppName}
                showEditButton={!keyIsAppName && !keyIsLayoutName}
                {...rest}
              />
            );
          })}
      </Table.Body>
    </Table>
  );
};
