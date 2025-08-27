import React from 'react';
import type { CodeListData } from '../CodeListPage';
import type { CodeListWithMetadata } from '../types/CodeListWithMetadata';
import { StudioAlert } from 'libs/studio-components-legacy/src';
import { EditCodeList } from './EditCodeList/EditCodeList';
import { Trans, useTranslation } from 'react-i18next';
import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';
import classes from './CodeLists.module.css';
import { getCodeListSourcesById, getCodeListUsageCount } from '../utils';
import type { TextResource } from 'libs/studio-components-legacy/src';
import { StudioDetails, StudioCard } from 'libs/studio-components/src';

export type CodeListsProps = {
  codeListDataList: CodeListData[];
  onCreateTextResource?: (textResource: TextResource) => void;
  onDeleteCodeList: (codeListId: string) => void;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUpdateTextResource?: (textResource: TextResource) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
  codeListsUsages: CodeListReference[];
  textResources?: TextResource[];
};

export function CodeLists({
  codeListDataList,
  codeListsUsages,
  ...rest
}: CodeListsProps): React.ReactElement[] {
  return codeListDataList.map((codeListData) => {
    const codeListSources = getCodeListSourcesById(codeListsUsages, codeListData.title);
    return (
      <CodeList
        key={codeListData.title}
        codeListData={codeListData}
        codeListSources={codeListSources}
        {...rest}
      />
    );
  });
}

type CodeListProps = Omit<CodeListsProps, 'codeListDataList' | 'codeListsUsages'> & {
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
    <StudioCard className={classes.codeListCard}>
      <StudioDetails defaultOpen={codeListInEditMode === codeListData.title}>
        <CodeListDetailsSummary
          codeListTitle={codeListData.title}
          codeListUsagesCount={getCodeListUsageCount(codeListSources)}
        />
        <CodeListDetailsContent
          codeListData={codeListData}
          codeListSources={codeListSources}
          {...rest}
        />
      </StudioDetails>
    </StudioCard>
  );
}

type CodeListDetailsSummaryProps = {
  codeListTitle: string;
  codeListUsagesCount: number;
};

function CodeListDetailsSummary({
  codeListTitle,
  codeListUsagesCount,
}: CodeListDetailsSummaryProps): React.ReactElement {
  const { t } = useTranslation();

  let codeListUsagesCountTextKey: string | null =
    'app_content_library.code_lists.code_list_details_usage_sub_title_plural';

  switch (codeListUsagesCount) {
    case 0: {
      codeListUsagesCountTextKey = null;
      break;
    }
    case 1: {
      codeListUsagesCountTextKey =
        'app_content_library.code_lists.code_list_details_usage_sub_title_single';
      break;
    }
  }

  return (
    <StudioDetails.Summary
      title={t('app_content_library.code_lists.code_list_details_title', {
        codeListTitle: codeListTitle,
      })}
    >
      <div className={classes.codeListTitle}>
        {codeListTitle}
        {codeListUsagesCountTextKey && (
          <div className={classes.codeListUsages}>
            {t(codeListUsagesCountTextKey, { codeListUsagesCount })}
          </div>
        )}
      </div>
    </StudioDetails.Summary>
  );
}

type CodeListDetailsContentProps = Omit<CodeListProps, 'codeListInEditMode'>;

function CodeListDetailsContent({
  codeListData,
  codeListSources,
  ...rest
}: CodeListDetailsContentProps): React.ReactElement {
  return (
    <StudioDetails.Content>
      {codeListData.hasError ? (
        <InvalidCodeListAlert />
      ) : (
        <EditCodeList
          codeList={codeListData.data}
          codeListTitle={codeListData.title}
          codeListSources={codeListSources}
          {...rest}
        />
      )}
    </StudioDetails.Content>
  );
}

function InvalidCodeListAlert(): React.ReactElement {
  return (
    <StudioAlert size='small' severity='danger'>
      <span>
        <Trans
          i18nKey='app_content_library.code_lists.format_error'
          components={{ bold: <strong /> }}
        />
      </span>
    </StudioAlert>
  );
}
