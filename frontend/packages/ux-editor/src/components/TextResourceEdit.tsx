import React, { useEffect, useState } from 'react';
import classes from './TextResourceEdit.module.css';
import type { ITextResource } from 'app-shared/types/global';
import { Button, Fieldset, LegacyTextArea } from '@digdir/design-system-react';
import { XMarkIcon } from '@navikt/aksel-icons';
import { getAllLanguages, getCurrentEditId } from '../selectors/textResourceSelectors';
import { setCurrentEditId } from '../features/appData/textResources/textResourcesSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useTextResourcesSelector } from '../hooks';
import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations';
import { useTranslation } from 'react-i18next';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../ux-editor/src/hooks/useAppContext';

export const TextResourceEdit = () => {
  const dispatch = useDispatch();
  const editId = useSelector(getCurrentEditId);
  const { org, app } = useStudioUrlParams();
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
        <Button
          color='second'
          icon={<XMarkIcon />}
          onClick={() => setEditId(undefined)}
          variant='primary'
          size='small'
        >
          {t('general.close')}
        </Button>
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
  const { org, app } = useStudioUrlParams();
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
      <LegacyTextArea
        rows={5}
        resize='vertical'
        label={t(`language.${language}`)}
        onBlur={(e) => updateTextResource((e.target as HTMLTextAreaElement).value)}
        onChange={(e) => setValue((e.target as HTMLTextAreaElement).value)}
        value={value}
      />
    </div>
  );
};
