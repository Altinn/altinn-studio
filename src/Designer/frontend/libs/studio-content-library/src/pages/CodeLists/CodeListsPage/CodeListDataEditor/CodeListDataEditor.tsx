import { useCallback, useMemo } from 'react';
import type { ChangeEventHandler, ReactElement, ReactNode } from 'react';
import { useCodeListEditorTexts } from '../useCodeListEditorTexts';
import {
  StudioCodeListEditor,
  StudioDeleteButton,
  StudioDetails,
  StudioTextfield,
} from '@studio/components';
import type { CodeList } from '../../../../types/CodeList';
import type { CodeListData } from '../../../../types/CodeListData';
import { codeListFileToData, updateCodes, updateName } from './utils';
import { useTranslation } from 'react-i18next';
import classes from './CodeListDataEditor.module.css';
import { Publishing } from './Publishing';
import { CodeListFile } from '../../../../types/CodeListFile';

export type CodeListDataEditorProps = Readonly<{
  file: CodeListFile;
  isPublishing: boolean;
  onDelete: () => void;
  onPublish: (data: CodeListData) => void;
  onUpdate: (newFile: CodeListFile) => void;
  publishedCodeLists: string[];
}>;

export function CodeListDataEditor({
  file,
  isPublishing,
  onDelete,
  onPublish,
  onUpdate,
  publishedCodeLists,
}: CodeListDataEditorProps): ReactElement {
  const texts = useCodeListEditorTexts();
  const { t } = useTranslation();

  const data = useMemo<CodeListData>(() => codeListFileToData(file), [file]);

  const handleNameChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const { value } = event.target;
      const newFile = updateName(file, value);
      onUpdate(newFile);
    },
    [file, onUpdate],
  );

  const handleCodeListUpdate = useCallback(
    (newCodeList: CodeList): void => {
      const newFile = updateCodes(file, newCodeList);
      onUpdate(newFile);
    },
    [file, onUpdate],
  );

  const handlePublish = useCallback((): void => onPublish(data), [data, onPublish]);

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
        <Publishing
          className={classes.publishing}
          codeListName={data.name}
          isPending={isPublishing}
          onPublish={handlePublish}
          publishedCodeLists={publishedCodeLists}
        />
        <StudioCodeListEditor
          className={classes.codes}
          codeList={data.codes}
          fallbackLanguage={DEFAULT_LANGUAGE}
          onUpdateCodeList={handleCodeListUpdate}
          texts={texts}
        />
      </StudioDetails.Content>
    </StudioDetails>
  );
}

const DEFAULT_LANGUAGE = 'nb';

function Name({ name }: Readonly<{ name: string }>): ReactNode {
  const { t } = useTranslation();
  if (name) return name;
  else
    return <span className={classes.unnamed}>{t('app_content_library.code_lists.unnamed')}</span>;
}
