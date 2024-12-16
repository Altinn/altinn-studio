import type { CodeList, CodeListEditorTexts } from '@studio/components';
import { StudioCodeListEditor, StudioToggleableTextfield } from '@studio/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../../CodeList';
import { useOptionListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { KeyVerticalIcon } from '@studio/icons';
import { updateCodeListWithMetadata } from '../CodeLists';
import { FileNameUtils } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from '../../hooks/useInputCodeListNameErrorMessage';
import classes from './EditCodeList.module.css';

export type EditCodeListProps = {
  codeList: CodeListWithMetadata;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
};

export function EditCodeList({
  codeList,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListNames,
}: EditCodeListProps): React.ReactElement {
  const { t } = useTranslation();
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();
  const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();

  const handleUpdateCodeListId = (newCodeListId: string) => {
    if (newCodeListId !== codeList.title) onUpdateCodeListId(codeList.title, newCodeListId);
  };

  const handleBlurAny = (updatedCodeList: CodeList): void => {
    const updatedCodeListWithMetadata = updateCodeListWithMetadata(codeList, updatedCodeList);
    onUpdateCodeList(updatedCodeListWithMetadata);
  };

  const handleValidateCodeListId = (newCodeListId: string) => {
    const fileNameError = FileNameUtils.findFileNameError(newCodeListId, codeListNames);
    return getInvalidInputFileNameErrorMessage(fileNameError);
  };

  return (
    <div className={classes.editCodeList}>
      <StudioToggleableTextfield
        customValidation={handleValidateCodeListId}
        inputProps={{
          label: t('app_content_library.code_lists.code_list_edit_id_label'),
          icon: <KeyVerticalIcon />,
          title: t('app_content_library.code_lists.code_list_edit_id_title', {
            codeListName: codeList.title,
          }),
          value: codeList.title,
          onBlur: (event) => handleUpdateCodeListId(event.target.value),
          size: 'small',
        }}
        viewProps={{
          children: codeList.title,
          variant: 'tertiary',
          title: t('app_content_library.code_lists.code_list_view_id_title', {
            codeListName: codeList.title,
          }),
        }}
      />
      <StudioCodeListEditor
        codeList={codeList.codeList}
        onBlurAny={handleBlurAny}
        texts={editorTexts}
      />
    </div>
  );
}
