import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { StudioCodeFragment, StudioTextarea } from '@studio/components';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import type { ITextResources } from 'app-shared/types/global';
import classes from './TextResourceValueEditor.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { useUpsertTextResourceMutation } from '../../../../hooks/mutations/useUpsertTextResourceMutation';

export type TextResourceValueEditorProps = {
  textResourceId: string;
};

const language = DEFAULT_LANGUAGE;

const findTextResource = (textResources: ITextResources, id: string) =>
  textResources?.[language]?.find((resource) => resource.id === id);

const getTextResourceValue = (textResources: ITextResources, id: string) =>
  findTextResource(textResources, id)?.value || '';

export const TextResourceValueEditor = ({ textResourceId }: TextResourceValueEditorProps) => {
  const { org, app } = useStudioUrlParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  const { mutate } = useUpsertTextResourceMutation(org, app);
  const value = getTextResourceValue(textResources, textResourceId);
  const [valueState, setValueState] = useState<string>(value);
  const { t } = useTranslation();

  useEffect(() => {
    setValueState(value);
  }, [value]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      mutate({ textId: textResourceId, language, translation: event.target.value });
    },
    [textResourceId, mutate],
  );

  return (
    <div className={classes.root}>
      <StudioTextarea
        label={t('ux_editor.text_resource_binding_text')}
        onBlur={handleChange}
        value={valueState}
      />
      <div className={classes.id}>
        <Trans
          i18nKey='ux_editor.text_resource_binding_id'
          values={{ id: textResourceId }}
          components={[<StudioCodeFragment key='0' />]}
        />
      </div>
    </div>
  );
};
