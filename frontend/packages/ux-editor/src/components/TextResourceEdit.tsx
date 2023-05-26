import React, { useEffect, useState } from 'react';
import classes from './TextResourceEdit.module.css';
import type { ITextResource } from 'app-shared/types/global';
import {
  Button,
  ButtonColor,
  ButtonVariant,
  FieldSet,
  TextArea,
} from '@digdir/design-system-react';
import { XMarkIcon } from '@navikt/aksel-icons';
import { getAllLanguages, getCurrentEditId } from '../selectors/textResourceSelectors';
import { setCurrentEditId } from '../features/appData/textResources/textResourcesSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useTextResourcesSelector } from '../hooks';
import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations';
import { useTranslation } from 'react-i18next';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';

export const TextResourceEdit = () => {
  const dispatch = useDispatch();
  const editId = useSelector(getCurrentEditId);
  const { org, app } = useParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  const languages: string[] = useTextResourcesSelector<string[]>(getAllLanguages);
  const setEditId = (id: string) => dispatch(setCurrentEditId(id));
  const { t } = useTranslation();

  if (!editId) {
    return null;
  }

  return (
    <FieldSet
      legend={t('ux_editor.edit_text_resource')}
      description={t('ux_editor.field_id', { id: editId })}
      contentClassName={classes.textBoxList}
    >
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
        color={ButtonColor.Secondary}
        icon={<XMarkIcon />}
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
  const { org, app } = useParams();
  const { mutate } = useUpsertTextResourcesMutation(org, app);

  const updateTextResource = (text: string) =>
    mutate({ language, textResources: [{ id: textResourceId, value: text }] });

  const [value, setValue] = useState<string>(textResource?.value || '');

  useEffect(() => {
    setValue(textResource?.value || '');
  }, [textResource?.value]);

  return (
    <div>
      <TextArea
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
