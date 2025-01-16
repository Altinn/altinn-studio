import React from 'react';
import type { CodeListData, CodeListWithMetadata } from '../CodeListPage';
import { Accordion } from '@digdir/designsystemet-react';
import { StudioAlert } from '@studio/components';
import { EditCodeList } from './EditCodeList/EditCodeList';
import { useTranslation } from 'react-i18next';
import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';
import classes from './CodeLists.module.css';
import { getCodeListSourcesById, getCodeListUsageCount } from '../utils/codeListPageUtils';

export type CodeListsProps = {
  codeListsData: CodeListData[];
  onDeleteCodeList: (codeListId: string) => void;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
  codeListsUsages: CodeListReference[];
};

export function CodeLists({
  codeListsData,
  codeListsUsages,
  ...rest
}: CodeListsProps): React.ReactElement[] {
  return codeListsData.map((codeListData) => {
    const codeListSources = getCodeListSourcesById(codeListsUsages, codeListData.title);
    return (
      <CodeList
        key={codeListData.title}
        codeListData={codeListData}
        {...rest}
        codeListSources={codeListSources}
      />
    );
  });
}

type CodeListProps = Omit<CodeListsProps, 'codeListsData' | 'codeListsUsages'> & {
  codeListData: CodeListData;
  codeListSources: CodeListIdSource[];
};

function CodeList({
  codeListData,
  codeListInEditMode,
  codeListSources,
  ...rest
}: CodeListProps): React.ReactElement {
  return (
    <Accordion border>
      <Accordion.Item defaultOpen={codeListInEditMode === codeListData.title}>
        <CodeListAccordionHeader
          codeListTitle={codeListData.title}
          codeListUsagesCount={getCodeListUsageCount(codeListSources)}
        />
        <CodeListAccordionContent
          codeListData={codeListData}
          codeListSources={codeListSources}
          {...rest}
        />
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
    <Accordion.Header
      title={t('app_content_library.code_lists.code_list_accordion_title', {
        codeListTitle: codeListTitle,
      })}
      className={classes.codeListTitle}
    >
      {codeListTitle}
      {codeListUsagesCountTextKey && (
        <div className={classes.codeListUsages}>
          {t(codeListUsagesCountTextKey, { codeListUsagesCount })}
        </div>
      )}
    </Accordion.Header>
  );
}

type CodeListAccordionContentProps = Omit<CodeListProps, 'codeListInEditMode'>;

function CodeListAccordionContent({
  codeListData,
  ...rest
}: CodeListAccordionContentProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Accordion.Content>
      {codeListData.hasError ? (
        <StudioAlert size='small' severity='danger'>
          {t('app_content_library.code_lists.fetch_error')}
        </StudioAlert>
      ) : (
        <EditCodeList codeList={codeListData.data} codeListTitle={codeListData.title} {...rest} />
      )}
    </Accordion.Content>
  );
}
