import type { CodeList, CodeListEditorTexts } from '@studio/components';
import { StudioCodeListEditor, StudioToggleableTextfield } from '@studio/components';
import React from 'react';
import type { CodeListWithMetadata } from '../../CodeList';
import { useOptionListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { KeyVerticalIcon } from '@studio/icons';

export type EditCodeListProps = {
  codeList: CodeListWithMetadata;
  onChangeCodeListId: (newTitle: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

export function EditCodeList({
  codeList,
  onChangeCodeListId,
  onUpdateCodeList,
}: EditCodeListProps): React.ReactElement {
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();

  const handleCodeListTitleChange = (title: string) => {
    // TODO: validate new name. - unique and same name restrictions as layoutName. Use in customValidation
    onChangeCodeListId(title);
  };

  const handleUpdateCodeList = (updatedCodeList: CodeList) => {
    onUpdateCodeList({ title: codeList.title, codeList: updatedCodeList });
  };

  return (
    <>
      <StudioToggleableTextfield
        customValidation={() => null}
        inputProps={{
          icon: <KeyVerticalIcon />,
          label: 'Navn',
          value: codeList.title,
          onBlur: (event) => handleCodeListTitleChange(event.target.value),
          size: 'small',
        }}
        viewProps={{
          children: codeList.title,
          variant: 'tertiary',
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
