import type { CodeList, CodeListEditorTexts } from '@studio/components';
import { StudioCodeListEditor, StudioToggleableTextfield } from '@studio/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../../CodeList';
import { useOptionListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { KeyVerticalIcon } from '@studio/icons';

export type EditCodeListProps = {
  codeList: CodeListWithMetadata;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

export function EditCodeList({
  codeList,
  onUpdateCodeListId,
  onUpdateCodeList,
}: EditCodeListProps): React.ReactElement {
  const { t } = useTranslation();
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();

  const handleUpdateCodeListId = (newCodeListId: string) => {
    // TODO: validate new name. - unique and same name restrictions as layoutName. Use in customValidation
    if (newCodeListId !== codeList.title) onUpdateCodeListId(codeList.title, newCodeListId);
  };

  const handleUpdateCodeList = (updatedCodeList: CodeList) => {
    onUpdateCodeList({ title: codeList.title, codeList: updatedCodeList });
  };

  return (
    <>
      <StudioToggleableTextfield
        inputProps={{
          icon: <KeyVerticalIcon />,
          name: t('app_content_library.code_lists.code_list_edit_id_title'),
          value: codeList.title,
          onBlur: (event) => handleUpdateCodeListId(event.target.value),
          size: 'small',
        }}
        viewProps={{
          children: codeList.title,
          variant: 'tertiary',
          name: t('app_content_library.code_lists.code_list_view_id_title'),
        }}
      />
      <StudioCodeListEditor
        codeList={codeList.codeList}
        onChange={handleUpdateCodeList}
        texts={editorTexts}
      />
    </>
  );
}
