import React, { useCallback } from 'react';
import type { ChangeEventHandler, ReactElement, ReactNode } from 'react';
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
import classes from './CodeListDataEditor.module.css';

export type CodeListDataEditorProps = Readonly<{
  data: CodeListData;
  onUpdate: (newData: CodeListData) => void;
  onDelete: () => void;
}>;

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
      <StudioDetails.Summary>
        <Name name={data.name} />
      </StudioDetails.Summary>
      <StudioDetails.Content className={classes.content}>
        <StudioTextfield
          className={classes.nameField}
          label={t('app_content_library.code_lists.name')}
          onChange={handleNameChange}
          value={data.name}
        />
        <StudioDeleteButton className={classes.deleteButton} onDelete={onDelete}>
          {t('general.delete')}
        </StudioDeleteButton>
        <StudioCodeListEditor
          className={classes.codes}
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

function Name({ name }: { name: string }): ReactNode {
  const { t } = useTranslation();
  if (name) return name;
  else
    return <span className={classes.unnamed}>{t('app_content_library.code_lists.unnamed')}</span>;
}
