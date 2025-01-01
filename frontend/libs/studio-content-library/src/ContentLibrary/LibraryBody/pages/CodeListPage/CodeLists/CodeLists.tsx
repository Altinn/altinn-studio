import React from 'react';
import type { CodeListWithMetadata } from '../CodeListPage';
import { Accordion } from '@digdir/designsystemet-react';
import { EditCodeList } from './EditCodeList/EditCodeList';
import { useTranslation } from 'react-i18next';
import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';
import classes from './CodeLists.module.css';

export type CodeListsProps = {
  codeLists: CodeListWithMetadata[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
  codeListsUsages: CodeListReference[];
};

export function CodeLists({
  codeLists,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListInEditMode,
  codeListNames,
  codeListsUsages,
}: CodeListsProps): React.ReactElement[] {
  return codeLists.map((codeList) => {
    const codeListSources = getCodeListSourcesById(codeListsUsages, codeList.title);
    return (
      <CodeList
        key={codeList.title}
        codeList={codeList}
        onUpdateCodeListId={onUpdateCodeListId}
        onUpdateCodeList={onUpdateCodeList}
        codeListInEditMode={codeListInEditMode}
        codeListNames={codeListNames}
        codeListSources={codeListSources}
      />
    );
  });
}

export const getCodeListSourcesById = (
  codeListsUsages: CodeListReference[],
  codeListTitle: string,
): CodeListIdSource[] => {
  const codeListUsages: CodeListReference | undefined = codeListsUsages.find(
    (codeListUsage) => codeListUsage.codeListId === codeListTitle,
  );
  return codeListUsages?.codeListIdSources ?? [];
};

type CodeListProps = {
  codeList: CodeListWithMetadata;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
  codeListSources: CodeListIdSource[];
};

function CodeList({
  codeList,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListInEditMode,
  codeListNames,
  codeListSources,
}: CodeListProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Accordion
      border
      title={t('app_content_library.code_lists.code_list_accordion_title', {
        codeListTitle: codeList.title,
      })}
    >
      <Accordion.Item defaultOpen={codeListInEditMode === codeList.title}>
        <CodeListAccordionHeader
          codeListTitle={codeList.title}
          codeListUsagesCount={codeListSources.length}
        />
        <Accordion.Content>
          <EditCodeList
            codeList={codeList}
            onUpdateCodeListId={onUpdateCodeListId}
            onUpdateCodeList={onUpdateCodeList}
            codeListNames={codeListNames}
            codeListSources={codeListSources}
          />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

type CodeListAccordionHeaderProps = {
  codeListTitle: string;
  codeListUsagesCount: number;
};

function CodeListAccordionHeader({
  codeListTitle,
  codeListUsagesCount,
}: CodeListAccordionHeaderProps): React.ReactElement {
  const { t } = useTranslation();

  let codeListUsagesCountTextKey: string =
    'app_content_library.code_lists.code_list_accordion_usage_sub_title_plural';

  switch (codeListUsagesCount) {
    case 0: {
      codeListUsagesCountTextKey = null;
      break;
    }
    case 1: {
      codeListUsagesCountTextKey =
        'app_content_library.code_lists.code_list_accordion_usage_sub_title_single';
      break;
    }
  }

  return (
    <Accordion.Header className={classes.codeListTitle}>
      {codeListTitle}
      {codeListUsagesCountTextKey && (
        <div className={classes.codeListUsages}>
          {t(codeListUsagesCountTextKey, { codeListUsagesCount })}
        </div>
      )}
    </Accordion.Header>
  );
}
