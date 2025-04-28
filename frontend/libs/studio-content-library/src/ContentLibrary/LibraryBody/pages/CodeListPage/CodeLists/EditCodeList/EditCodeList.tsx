import type {
  CodeList,
  CodeListEditorTexts,
  TextResource,
  CreateTextResourceArgs,
} from '@studio/components-legacy';
import {
  StudioDeleteButton,
  StudioModal,
  StudioDisplayTile,
  StudioCodeListEditor,
  StudioToggleableTextfield,
} from '@studio/components-legacy';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../../types/CodeListWithMetadata';
import { useCodeListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { EyeIcon, KeyVerticalIcon } from '@studio/icons';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from '../../hooks/useInputCodeListNameErrorMessage';
import type { CodeListIdSource } from '../../types/CodeListReference';
import { CodeListUsages } from './CodeListUsages/CodeListUsages';
import classes from './EditCodeList.module.css';

export type EditCodeListProps = {
  codeList: CodeList;
  codeListTitle: string;
  onBlurTextResource?: (textResource: TextResource) => void;
  onDeleteCodeList: (codeListId: string) => void;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
  codeListSources: CodeListIdSource[];
  textResources?: TextResource[];
};

export function EditCodeList({
  codeList,
  codeListTitle,
  onBlurTextResource,
  onDeleteCodeList,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListNames,
  codeListSources,
  textResources,
}: EditCodeListProps): React.ReactElement {
  const editorTexts: CodeListEditorTexts = useCodeListEditorTexts();

  const handleUpdateCodeList = (updatedCodeList: CodeList): void => {
    const updatedCodeListWithMetadata = updateCodeListWithMetadata(
      { title: codeListTitle, codeList: codeList },
      updatedCodeList,
    );
    onUpdateCodeList(updatedCodeListWithMetadata);
  };

  const handleUpdateTextResource = (newTextResource: TextResource): void => {
    onBlurTextResource && onBlurTextResource(newTextResource);
  };

  const handleCreateTextResource = ({
    codeList: newCodeList,
    textResource: newTextResource,
  }: CreateTextResourceArgs): void => {
    handleUpdateCodeList(newCodeList);
    onBlurTextResource && onBlurTextResource(newTextResource);
  };

  const handleDeleteCodeList = (): void => onDeleteCodeList(codeListTitle);

  const codeListHasUsages = codeListSources.length > 0;
  const isCodeListEditable = codeListSources.length === 0;

  return (
    <div className={classes.editCodeList}>
      <EditCodeListTitle
        codeListTitle={codeListTitle}
        isCodeListEditable={isCodeListEditable}
        codeListNames={codeListNames}
        onUpdateCodeListId={onUpdateCodeListId}
      />
      <StudioCodeListEditor
        codeList={codeList}
        onCreateTextResource={handleCreateTextResource}
        onUpdateTextResource={handleUpdateTextResource}
        onUpdateCodeList={handleUpdateCodeList}
        texts={editorTexts}
        textResources={textResources}
      />
      <CodeListButtons
        codeListHasUsages={codeListHasUsages}
        codeListSources={codeListSources}
        onDeleteCodeList={handleDeleteCodeList}
        codeListTitle={codeListTitle}
      />
    </div>
  );
}

export const updateCodeListWithMetadata = (
  currentCodeListWithMetadata: CodeListWithMetadata,
  updatedCodeList: CodeList,
): CodeListWithMetadata => {
  return { ...currentCodeListWithMetadata, codeList: updatedCodeList };
};

type EditCodeListTitleProps = {
  codeListTitle: string;
  isCodeListEditable: boolean;
  codeListNames: string[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
};

function EditCodeListTitle({
  codeListTitle,
  isCodeListEditable,
  codeListNames,
  onUpdateCodeListId,
}: EditCodeListTitleProps): React.ReactElement {
  const { t } = useTranslation();
  const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();

  const handleUpdateCodeListId = (newCodeListId: string) => {
    if (newCodeListId !== codeListTitle) onUpdateCodeListId(codeListTitle, newCodeListId);
  };

  const handleValidateCodeListId = (newCodeListId: string) => {
    const invalidCodeListNames = ArrayUtils.removeItemByValue(codeListNames, codeListTitle);
    const fileNameError = FileNameUtils.findFileNameError(newCodeListId, invalidCodeListNames);
    return getInvalidInputFileNameErrorMessage(fileNameError);
  };

  return isCodeListEditable ? (
    <StudioToggleableTextfield
      customValidation={handleValidateCodeListId}
      label={t('app_content_library.code_lists.code_list_edit_id_label')}
      onBlur={(event) => handleUpdateCodeListId(event.target.value)}
      title={t('app_content_library.code_lists.code_list_view_id_title', {
        codeListName: codeListTitle,
      })}
      value={codeListTitle}
    />
  ) : (
    <StudioDisplayTile
      title={t('app_content_library.code_lists.code_list_edit_id_disabled_title')}
      label={t('app_content_library.code_lists.code_list_edit_id_label')}
      value={codeListTitle}
      icon={<KeyVerticalIcon />}
      className={classes.displayTitle}
    />
  );
}

type CodeListButtonsProps = {
  codeListHasUsages: boolean;
  codeListSources: CodeListIdSource[];
  onDeleteCodeList: (codeListId: string) => void;
  codeListTitle: string;
};

function CodeListButtons({
  codeListHasUsages,
  codeListSources,
  onDeleteCodeList,
  codeListTitle,
}: CodeListButtonsProps): React.ReactElement {
  const { t } = useTranslation();
  const deleteButtonTitle = codeListHasUsages
    ? t('app_content_library.code_lists.code_list_delete_disabled_title')
    : t('app_content_library.code_lists.code_list_delete_enabled_title');

  return (
    <div className={classes.buttons}>
      <StudioDeleteButton
        onDelete={onDeleteCodeList}
        title={deleteButtonTitle}
        disabled={codeListHasUsages}
        confirmMessage={t('app_content_library.code_lists.code_list_delete_confirm', {
          codeListTitle,
        })}
      >
        {t('app_content_library.code_lists.code_list_delete')}
      </StudioDeleteButton>
      {codeListHasUsages && <ShowCodeListUsagesSourcesModal codeListSources={codeListSources} />}
    </div>
  );
}

export type ShowCodeListUsagesSourcesModalProps = {
  codeListSources: CodeListIdSource[];
};

function ShowCodeListUsagesSourcesModal({
  codeListSources,
}: ShowCodeListUsagesSourcesModalProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <StudioModal.Root>
      <StudioModal.Trigger
        icon={<EyeIcon className={classes.seeUsageIcon} />}
        variant='tertiary'
        className={classes.codeListUsageButton}
      >
        {t('app_content_library.code_lists.code_list_show_usage')}
      </StudioModal.Trigger>
      <StudioModal.Dialog
        closeButtonTitle={t('general.close')}
        heading={t('app_content_library.code_lists.code_list_show_usage_modal_title')}
      >
        <CodeListUsages codeListSources={codeListSources} />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
