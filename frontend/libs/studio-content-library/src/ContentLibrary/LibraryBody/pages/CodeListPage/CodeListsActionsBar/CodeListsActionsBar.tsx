import React from 'react';
import type { TextResource } from '@studio/components-legacy';
import { StudioSearch } from '@studio/components-legacy';
import type { ChangeEvent } from 'react';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';
import { AddCodeListDropdown } from './AddCodeListDropdown';
import type { CodeListWithMetadata } from '../types/CodeListWithMetadata';
import type { ExternalResource } from 'app-shared/types/ExternalResource';

export type CodeListsActionsBarProps = {
  onBlurTextResource?: (textResource: TextResource) => void;
  onUploadCodeList: (updatedCodeList: File) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
  onSetSearchString: (searchString: string) => void;
  textResources?: TextResource[];
  externalResourceIds?: ExternalResource[];
  onImportCodeListFromOrg?: (codeListId: string) => void;
};

export function CodeListsActionsBar({
  onBlurTextResource,
  onUploadCodeList,
  onUpdateCodeList,
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
        onUploadCodeList={onUploadCodeList}
        onUpdateCodeList={onUpdateCodeList}
        textResources={textResources}
        externalResourceIds={externalResourceIds}
        onImportCodeListFromOrg={onImportCodeListFromOrg}
      />
    </div>
  );
}
