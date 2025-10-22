import React, { useCallback } from 'react';
import type { ChangeEventHandler, ReactElement } from 'react';
import { useCodeListEditorTexts } from '../useCodeListEditorTexts';
import {
  StudioCodeListEditor,
  StudioDeleteButton,
  StudioDetails,
  StudioTextfield,
} from '@studio/components';
import type { CodeList } from '../types/CodeList';
import type { CodeListData } from '../types/CodeListData';
import { updateCodes, updateName } from './utils';
import { useTranslation } from 'react-i18next';

export type CodeListDataEditorProps = {
  data: CodeListData;
  onUpdate: (newData: CodeListData) => void;
  onDelete: () => void;
};

export function CodeListDataEditor({
  data,
  onDelete,
  onUpdate,
}: CodeListDataEditorProps): ReactElement {
  const texts = useCodeListEditorTexts();
  const { t } = useTranslation();

  const handleNameChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const { value } = event.target;
      const newData = updateName(data, value);
      onUpdate(newData);
    },
    [data, onUpdate],
  );

  const handleCodeListUpdate = useCallback(
    (newCodeList: CodeList): void => {
      const newData = updateCodes(data, newCodeList);
      onUpdate(newData);
    },
    [data, onUpdate],
  );

  return (
    <StudioDetails>
      <StudioDetails.Summary>{data.name}</StudioDetails.Summary>
      <StudioDetails.Content>
        <StudioTextfield
          label={t('app_content_library.code_lists.name')}
          value={data.name}
          onChange={handleNameChange}
        />
        <StudioDeleteButton onDelete={onDelete}>{t('general.delete')}</StudioDeleteButton>
        <StudioCodeListEditor
          codeList={data.codes}
          language={DEFAULT_LANGUAGE}
          onUpdateCodeList={handleCodeListUpdate}
          texts={texts}
        />
      </StudioDetails.Content>
    </StudioDetails>
  );
}

const DEFAULT_LANGUAGE = 'nb';
