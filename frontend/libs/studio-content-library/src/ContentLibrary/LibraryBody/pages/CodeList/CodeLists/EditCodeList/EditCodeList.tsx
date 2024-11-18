import type { CodeList, CodeListEditorTexts } from '@studio/components';
import { StudioCodeListEditor, StudioToggleableTextfield } from '@studio/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../../CodeList';
import { useOptionListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { KeyVerticalIcon } from '@studio/icons';
import {updateCodeListWithMetadata} from "../CodeLists";

export type EditCodeListProps = {
  codeList: CodeListWithMetadata;
  onChangeCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

export function EditCodeList({
  codeList,
  onChangeCodeListId,
  onUpdateCodeList,
}: EditCodeListProps): React.ReactElement {
  const { t } = useTranslation();
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();

  const handleCodeListTitleChange = (newCodeListId: string) => {
      if (newCodeListId !== codeList.title) onChangeCodeListId(codeList.title, newCodeListId);
  };

    const handleBlurAny = (updatedCodeList: CodeList): void => {
        const updatedCodeListWithMetadata = updateCodeListWithMetadata(codeList, updatedCodeList);
        onUpdateCodeList(updatedCodeListWithMetadata);
    };

  return (
    <>
      <StudioToggleableTextfield
        inputProps={{
          icon: <KeyVerticalIcon />,
          title: t('app_content_library.code_lists.code_list_edit_id_title'),
          value: codeList.title,
          onBlur: (event) => handleCodeListTitleChange(event.target.value),
          size: 'small',
        }}
        viewProps={{
          children: codeList.title,
          variant: 'tertiary',
          title: t('app_content_library.code_lists.code_list_view_id_title'),
        }}
      />
      <StudioCodeListEditor
        codeList={codeList.codeList}
        onBlurAny={handleBlurAny}
        texts={editorTexts}
      />
    </>
  );
}
