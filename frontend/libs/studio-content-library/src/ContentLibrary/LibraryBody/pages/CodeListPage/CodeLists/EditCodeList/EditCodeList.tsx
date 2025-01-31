import type { CodeList, CodeListEditorTexts } from '@studio/components';
import {
  StudioDeleteButton,
  StudioModal,
  StudioDisplayTile,
  StudioCodeListEditor,
  StudioToggleableTextfield,
} from '@studio/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../../CodeListPage';
import { useCodeListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { EyeIcon } from '@studio/icons';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from '../../hooks/useInputCodeListNameErrorMessage';
import classes from './EditCodeList.module.css';
import type { CodeListIdSource } from '../../types/CodeListReference';
import { CodeListUsages } from './CodeListUsages/CodeListUsages';

export type EditCodeListProps = {
  codeList: CodeList;
  codeListTitle: string;
  onDeleteCodeList: (codeListId: string) => void;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
  codeListSources: CodeListIdSource[];
};

export function EditCodeList({
  codeList,
  codeListTitle,
  onDeleteCodeList,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListNames,
  codeListSources,
}: EditCodeListProps): React.ReactElement {
  const editorTexts: CodeListEditorTexts = useCodeListEditorTexts();

  const handleCodeListChange = (updatedCodeList: CodeList): void => {
    const updatedCodeListWithMetadata = updateCodeListWithMetadata(
      { title: codeListTitle, codeList: codeList },
      updatedCodeList,
    );
    onUpdateCodeList(updatedCodeListWithMetadata);
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
        onAddOrDeleteItem={handleCodeListChange}
        onBlurAny={handleCodeListChange}
        texts={editorTexts}
      />
      <CodeListButtons
        codeListHasUsages={codeListHasUsages}
        codeListSources={codeListSources}
        onDeleteCodeList={handleDeleteCodeList}
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
      inputProps={{
        label: t('app_content_library.code_lists.code_list_edit_id_label'),
        title: t('app_content_library.code_lists.code_list_edit_id_title', {
          codeListName: codeListTitle,
        }),
        value: codeListTitle,
        onBlur: (event) => handleUpdateCodeListId(event.target.value),
        size: 'small',
      }}
      viewProps={{
        value: codeListTitle,
        title: t('app_content_library.code_lists.code_list_view_id_title', {
          codeListName: codeListTitle,
        }),
      }}
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
};

function CodeListButtons({
  codeListHasUsages,
  codeListSources,
  onDeleteCodeList,
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
