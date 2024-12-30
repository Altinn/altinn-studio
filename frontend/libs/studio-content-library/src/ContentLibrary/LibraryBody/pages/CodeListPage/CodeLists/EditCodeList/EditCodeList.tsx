import type {
  CodeList as StudioComponentsCodeList,
  CodeList,
  CodeListEditorTexts,
} from '@studio/components';
import { StudioModal, StudioCodeListEditor, StudioToggleableTextfield } from '@studio/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../../CodeListPage';
import { useCodeListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { KeyVerticalIcon } from '@studio/icons';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from '../../hooks/useInputCodeListNameErrorMessage';
import classes from './EditCodeList.module.css';
import type { CodeListIdSource } from '../../types/CodeListReference';
import { CodeListUsages } from './CodeListUsages/CodeListUsages';

export type EditCodeListProps = {
  codeList: CodeList;
  codeListTitle: string;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
  codeListSources: CodeListIdSource[];
};

export function EditCodeList({
  codeList,
  codeListTitle,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListNames,
  codeListSources,
}: EditCodeListProps): React.ReactElement {
  const { t } = useTranslation();
  const editorTexts: CodeListEditorTexts = useCodeListEditorTexts();
  const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();

  const handleUpdateCodeListId = (newCodeListId: string) => {
    if (newCodeListId !== codeListTitle) onUpdateCodeListId(codeListTitle, newCodeListId);
  };

  const handleBlurAny = (updatedCodeList: CodeList): void => {
    const updatedCodeListWithMetadata = updateCodeListWithMetadata(
      { title: codeListTitle, codeList: codeList },
      updatedCodeList,
    );
    onUpdateCodeList(updatedCodeListWithMetadata);
  };

  const handleValidateCodeListId = (newCodeListId: string) => {
    const invalidCodeListNames = ArrayUtils.removeItemByValue(codeListNames, codeListTitle);
    const fileNameError = FileNameUtils.findFileNameError(newCodeListId, invalidCodeListNames);
    return getInvalidInputFileNameErrorMessage(fileNameError);
  };

  return (
    <div className={classes.editCodeList}>
      {codeListSources.length > 0 && (
        <ShowCodeListUsagesSourcesModal
          codeListSources={codeListSources}
          codeListTitle={codeList.title}
        />
      )}
      <StudioToggleableTextfield
        customValidation={handleValidateCodeListId}
        inputProps={{
          label: t('app_content_library.code_lists.code_list_edit_id_label'),
          icon: <KeyVerticalIcon />,
          title: t('app_content_library.code_lists.code_list_edit_id_title', {
            codeListName: codeListTitle,
          }),
          value: codeListTitle,
          onBlur: (event) => handleUpdateCodeListId(event.target.value),
          size: 'small',
        }}
        viewProps={{
          label: t('app_content_library.code_lists.code_list_edit_id_label'),
          children: codeListTitle,
          variant: 'tertiary',
          title: t('app_content_library.code_lists.code_list_view_id_title', {
            codeListName: codeListTitle,
          }),
        }}
      />
      <StudioCodeListEditor codeList={codeList} onBlurAny={handleBlurAny} texts={editorTexts} />
    </div>
  );
}

export const updateCodeListWithMetadata = (
  currentCodeListWithMetadata: CodeListWithMetadata,
  updatedCodeList: StudioComponentsCodeList,
): CodeListWithMetadata => {
  return { ...currentCodeListWithMetadata, codeList: updatedCodeList };
};

export type ShowCodeListUsagesSourcesModalProps = {
  codeListSources: CodeListIdSource[];
  codeListTitle: string;
};

function ShowCodeListUsagesSourcesModal({
  codeListSources,
  codeListTitle,
}: ShowCodeListUsagesSourcesModalProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <StudioModal.Root>
      <StudioModal.Trigger variant='tertiary' className={classes.codeListUsageButton}>
        {t('app_content_library.code_lists.code_list_show_usage')}
      </StudioModal.Trigger>
      <StudioModal.Dialog
        closeButtonTitle={t('general.close')}
        heading={t('app_content_library.code_lists.code_list_show_usage_modal_title', {
          codeListTitle,
        })}
      >
        <CodeListUsages codeListSources={codeListSources} />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
