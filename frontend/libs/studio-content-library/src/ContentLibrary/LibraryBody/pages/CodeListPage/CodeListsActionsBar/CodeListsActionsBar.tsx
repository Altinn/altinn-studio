import React from 'react';
import type { TextResource } from '@studio/components-legacy';
import { StudioSearch } from '@studio/components-legacy';
import type { ChangeEvent } from 'react';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';
import { AddCodeListDropdown } from './AddCodeListDropdown';
import type { CodeListWithMetadata } from '../types/CodeListWithMetadata';

export type CodeListsActionsBarProps = {
  onBlurTextResource?: (textResource: TextResource) => void;
  onCreateCodeList: (newCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (updatedCodeList: File) => void;
  codeListNames: string[];
  onSetSearchString: (searchString: string) => void;
  textResources?: TextResource[];
  externalResourceIds?: string[];
  onImportCodeListFromOrg?: (codeListId: string) => void;
};

export function CodeListsActionsBar({
  onBlurTextResource,
  onCreateCodeList,
  onUploadCodeList,
  codeListNames,
  onSetSearchString,
  textResources,
  externalResourceIds,
  onImportCodeListFromOrg,
}: CodeListsActionsBarProps) {
  const { t } = useTranslation();

  const handleChangeSearch = (event: ChangeEvent<HTMLInputElement>) =>
    onSetSearchString(event.target.value);

  const handleClearSearch = () => onSetSearchString('');

  return (
    <div className={classes.actionsBar}>
      <StudioSearch
        label={t('app_content_library.code_lists.search_label')}
        onChange={handleChangeSearch}
        clearButtonLabel={t('app_content_library.code_lists.clear_search_button_label')}
        onClear={handleClearSearch}
      />
      <AddCodeListDropdown
        codeListNames={codeListNames}
        onBlurTextResource={onBlurTextResource}
        onCreateCodeList={onCreateCodeList}
        onUploadCodeList={onUploadCodeList}
        textResources={textResources}
        externalResourceIds={externalResourceIds}
        onImportCodeListFromOrg={onImportCodeListFromOrg}
      />
    </div>
  );
}
