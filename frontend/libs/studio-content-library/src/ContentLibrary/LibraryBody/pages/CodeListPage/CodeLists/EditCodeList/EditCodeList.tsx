import type { CodeList, CodeListEditorTexts } from '@studio/components';
import { StudioCodeListEditor, StudioToggleableTextfield } from '@studio/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../../CodeListPage';
import { useCodeListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { updateCodeListWithMetadata } from '../CodeLists';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from '../../hooks/useInputCodeListNameErrorMessage';
import classes from './EditCodeList.module.css';

export type EditCodeListProps = {
  codeList: CodeList;
  codeListTitle: string;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
};

export function EditCodeList({
  codeList,
  codeListTitle,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListNames,
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
      <StudioToggleableTextfield
        customValidation={handleValidateCodeListId}
        label={t('app_content_library.code_lists.code_list_edit_id_label')}
        onBlur={(event) => handleUpdateCodeListId(event.target.value)}
        title={t('app_content_library.code_lists.code_list_edit_id_title', {
          codeListName: codeListTitle,
        })}
        value={codeListTitle}
      />
      <StudioCodeListEditor codeList={codeList} onBlurAny={handleBlurAny} texts={editorTexts} />
    </div>
  );
}
