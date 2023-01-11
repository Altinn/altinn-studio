import React, { useEffect, useState } from 'react';
import classes from './TextResourceEdit.module.css';
import type { ITextResource } from '../types/global';
import { TextArea } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant, FieldSet } from '@digdir/design-system-react';
import { Close } from '@navikt/ds-icons';
import { getAllTextResources, getCurrentEditId } from '../selectors/textResourceSelectors';
import { setCurrentEditId, upsertTextResources } from '../features/appData/textResources/textResourcesSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useText } from '../hooks';

export const TextResourceEdit = () => {

  const dispatch = useDispatch();
  const editId = useSelector(getCurrentEditId);
  const textResources = useSelector(getAllTextResources);
  const setEditId = (id: string) => dispatch(setCurrentEditId(id));
  const t = useText();

  if (!editId) {
    return null;
  }
  const languages = Object.keys(textResources);

  return (
    <FieldSet
      legend={t('ux_editor.edit_text_resource')}
      description={t('ux_editor.field_id').replace('{id}', editId)}
      contentClass={classes.textBoxList}
    >
      {languages.map((language) => (
        <TextBox
          key={language}
          language={language}
          t={t}
          textResource={textResources[language]?.find((resource) => resource.id === editId)}
          textResourceId={editId}
        />
      ))}
      <Button
        color={ButtonColor.Secondary}
        icon={<Close />}
        onClick={() => setEditId(undefined)}
        variant={ButtonVariant.Outline}
      >
        {t('general.close')}
      </Button>
    </FieldSet>
  );
};

interface TextBoxProps {
  language: string;
  t: (key: string) => string;
  textResource?: ITextResource;
  textResourceId: string;
}

const TextBox = ({ language, t, textResource, textResourceId }: TextBoxProps) => {

  const dispatch = useDispatch();

  const updateTextResource = (text: string) => {
    dispatch(upsertTextResources({ language, textResources: { [textResourceId]: text } }));
  }

  const [value, setValue] = useState<string>(textResource?.value || '');

  useEffect(() => {
    setValue(textResource?.value || '');
  }, [textResource?.value]);

  return (
    <div>
      <TextArea
        label={t(`language.${language}`)}
        onBlur={(e) => updateTextResource((e.target as HTMLTextAreaElement).value)}
        onChange={(e) => setValue((e.target as HTMLTextAreaElement).value)}
        value={value}
      />
    </div>
  );
};
