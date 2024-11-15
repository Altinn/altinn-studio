import type { CodeList, CodeListEditorTexts } from '@studio/components';
import { StudioCodeListEditor, StudioToggleableTextfield } from '@studio/components';
import React from 'react';
import type { CodeListWithMetadata } from '../../CodeList';
import { useOptionListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { KeyVerticalIcon } from '@studio/icons';
import {updateCodeListWithMetadata} from "../CodeLists";

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
    onChangeCodeListId(title);
  };

    const handleBlurAny = (updatedCodeList: StudioComponentsCodeList): void => {
        const updatedCodeListWithMetadata = updateCodeListWithMetadata(codeList, updatedCodeList);
        onUpdateCodeList(updatedCodeListWithMetadata);
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
        onBlurAny={handleBlurAny}
        texts={editorTexts}
      />
    </>
  );
}
