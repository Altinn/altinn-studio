import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { StudioCodeFragment, StudioTextarea } from '@studio/components';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import classes from './TextResourceValueEditor.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { useAppContext } from '../../../../hooks';

export type TextResourceValueEditorProps = {
  textResourceId: string;
  onReferenceChange: (id: string) => void;
};

const language = DEFAULT_LANGUAGE;

const findTextResource = (textResources: ITextResources, id: string) =>
  textResources?.[language]?.find((resource) => resource.id === id);

const getTextResourceValue = (textResources: ITextResources, id: string) =>
  findTextResource(textResources, id)?.value || '';

export const TextResourceValueEditor = ({
  onReferenceChange,
  textResourceId,
}: TextResourceValueEditorProps) => {
  const { org, app } = useStudioUrlParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  const { refetchTexts } = useAppContext();
  const { mutate } = useUpsertTextResourcesMutation(org, app);
  const value = getTextResourceValue(textResources, textResourceId);
  const [valueState, setValueState] = useState<string>(value);
  const { t } = useTranslation();

  useEffect(() => {
    setValueState(value);
  }, [value]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const textResource: ITextResource = { id: textResourceId, value: event.target.value };
      mutate(
        { language, textResources: [textResource] },
        {
          onSuccess: async () => {
            await refetchTexts(language);
          },
        },
      );
    },
    [textResourceId, mutate, refetchTexts],
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
