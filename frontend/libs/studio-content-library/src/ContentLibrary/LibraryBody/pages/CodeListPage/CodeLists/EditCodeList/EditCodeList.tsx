import type { CodeList, CodeListEditorTexts } from '@studio/components';
import {
  StudioDisplayTile,
  StudioCodeListEditor,
  StudioToggleableTextfield,
} from '@studio/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../../CodeListPage';
import { useCodeListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { KeyVerticalIcon } from '@studio/icons';
import { updateCodeListWithMetadata } from '../CodeLists';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from '../../hooks/useInputCodeListNameErrorMessage';
import classes from './EditCodeList.module.css';
import type { CodeListIdSource } from '../../types/CodeListReference';

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
  const editorTexts: CodeListEditorTexts = useCodeListEditorTexts();

  const handleBlurAny = (updatedCodeList: CodeList): void => {
    const updatedCodeListWithMetadata = updateCodeListWithMetadata(
      { title: codeListTitle, codeList: codeList },
      updatedCodeList,
    );
    onUpdateCodeList(updatedCodeListWithMetadata);
  };

  return (
    <div className={classes.editCodeList}>
      <EditCodeListTitle
        codeListTitle={codeListTitle}
        codeListIsEditable={codeListSources.length === 0}
        codeListNames={codeListNames}
        onUpdateCodeListId={onUpdateCodeListId}
      />
      <StudioCodeListEditor codeList={codeList} onBlurAny={handleBlurAny} texts={editorTexts} />
    </div>
  );
}

type EditCodeListTitleProps = {
  codeListTitle: string;
  codeListIsEditable: boolean;
  codeListNames: string[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
};

function EditCodeListTitle({
  codeListTitle,
  codeListIsEditable,
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

  return codeListIsEditable ? (
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
  ) : (
    <StudioDisplayTile
      title={t('app_content_library.code_lists.code_list_edit_id_disabled_title')}
      label={t('app_content_library.code_lists.code_list_edit_id_label')}
      value={codeListTitle}
      icon={<KeyVerticalIcon />}
    />
  );
}
