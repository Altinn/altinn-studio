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
  onSetTextResource?: (textResource: TextResource) => void;
  onCreateCodeList: (newCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (updatedCodeList: File) => void;
  codeListNames: string[];
  onSetSearchString: (searchString: string) => void;
  textResources?: TextResource[];
  externalResources?: ExternalResource[];
  onImportCodeListFromOrg?: (codeListId: string) => void;
};

export function CodeListsActionsBar({
  onSetTextResource,
  onCreateCodeList,
  onUploadCodeList,
  codeListNames,
  onSetSearchString,
  textResources,
  externalResources,
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
        onSetTextResource={onSetTextResource}
        onCreateCodeList={onCreateCodeList}
        onUploadCodeList={onUploadCodeList}
        textResources={textResources}
        externalResources={externalResources}
        onImportCodeListFromOrg={onImportCodeListFromOrg}
      />
    </div>
  );
}
