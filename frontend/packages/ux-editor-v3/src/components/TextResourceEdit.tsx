import React, { useEffect, useState } from 'react';
import classes from './TextResourceEdit.module.css';
import type { ITextResource } from 'app-shared/types/global';
import { Fieldset } from '@digdir/designsystemet-react';
import { XMarkIcon } from '@studio/icons';
import { getAllLanguages, getCurrentEditId } from '../selectors/textResourceSelectors';
import { setCurrentEditId } from '../features/appData/textResources/textResourcesSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useTextResourcesSelector } from '../hooks';
import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations';
import { useTranslation } from 'react-i18next';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../hooks/useAppContext';
import { StudioTextarea } from '@studio/components-legacy';
import { StudioButton } from '@studio/components';

export const TextResourceEdit = () => {
  const dispatch = useDispatch();
  const editId = useSelector(getCurrentEditId);
  const { org, app } = useStudioEnvironmentParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  const languages: string[] = useTextResourcesSelector<string[]>(getAllLanguages);
  const setEditId = (id: string) => dispatch(setCurrentEditId(id));
  const { t } = useTranslation();

  if (!editId) {
    return null;
  }

  return (
    <Fieldset
      legend={t('ux_editor.edit_text_resource')}
      description={t('ux_editor.field_id', { id: editId })}
    >
      <div className={classes.textBoxList}>
        {languages.map((language) => (
          <TextBox
            key={language}
            language={language}
            t={t}
            textResource={textResources?.[language]?.find((resource) => resource.id === editId)}
            textResourceId={editId}
          />
        ))}
        <StudioButton
          color='second'
          icon={<XMarkIcon />}
          onClick={() => setEditId(undefined)}
          variant='primary'
        >
          {t('general.close')}
        </StudioButton>
      </div>
    </Fieldset>
  );
};

export interface TextBoxProps {
  language: string;
  t: (key: string) => string;
  textResource?: ITextResource;
  textResourceId: string;
}

const TextBox = ({ language, t, textResource, textResourceId }: TextBoxProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate } = useUpsertTextResourcesMutation(org, app);

  const { previewIframeRef } = useAppContext();
  const textResourceValue = textResource?.value || '';

  const updateTextResource = (text: string) => {
    if (text === textResourceValue) return;

    mutate({
      language,
      textResources: [{ id: textResourceId, value: text, variables: textResource?.variables }],
    });
    previewIframeRef.current?.contentWindow.location.reload();
  };

  const [value, setValue] = useState<string>(textResourceValue);

  useEffect(() => {
    setValue(textResourceValue);
  }, [textResourceValue]);

  return (
    <div>
      <StudioTextarea
        rows={5}
        label={t(`language.${language}`)}
        onBlur={(e) => updateTextResource((e.target as HTMLTextAreaElement).value)}
        onChange={(e) => setValue((e.target as HTMLTextAreaElement).value)}
        value={value}
      />
    </div>
  );
};
