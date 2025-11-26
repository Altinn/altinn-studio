import React from 'react';
import type { TextResource } from '@studio/components-legacy';
import { StudioSearch } from '@studio/components';
import type { ChangeEvent } from 'react';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';
import { AddCodeListDropdown } from './AddCodeListDropdown';
import type { CodeListWithMetadata } from '../types/CodeListWithMetadata';
import type { ExternalResource } from 'app-shared/types/ExternalResource';

export type CodeListsActionsBarProps = {
  onCreateCodeList: (newCodeList: CodeListWithMetadata) => void;
  onCreateTextResource?: (textResource: TextResource) => void;
  onUpdateTextResource?: (textResource: TextResource) => void;
  onUploadCodeList: (updatedCodeList: File) => void;
  codeListNames: string[];
  onSetSearchString: (searchString: string) => void;
  textResources?: TextResource[];
  externalResources?: ExternalResource[];
  onImportCodeListFromOrg?: (codeListId: string) => void;
};

export function CodeListsActionsBar({
  onCreateTextResource,
  onCreateCodeList,
  onUpdateTextResource,
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

  return (
    <div className={classes.actionsBar}>
      <StudioSearch
        className={classes.search}
        label={t('app_content_library.code_lists_with_text_resources.search_label')}
        onChange={handleChangeSearch}
        clearButtonLabel={t('general.search_clear_button_title')}
      />
      <AddCodeListDropdown
        codeListNames={codeListNames}
        onCreateCodeList={onCreateCodeList}
        onCreateTextResource={onCreateTextResource}
        onUpdateTextResource={onUpdateTextResource}
        onUploadCodeList={onUploadCodeList}
        textResources={textResources}
        externalResources={externalResources}
        onImportCodeListFromOrg={onImportCodeListFromOrg}
      />
    </div>
  );
}
