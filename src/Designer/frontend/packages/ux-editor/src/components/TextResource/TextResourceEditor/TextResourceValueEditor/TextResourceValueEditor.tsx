import React from 'react';
import { StudioTextarea } from '@studio/components-legacy';
import { StudioCodeFragment } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import type { ITextResources } from 'app-shared/types/global';
import classes from './TextResourceValueEditor.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { useAutoSizeTextArea } from 'app-shared/hooks/useAutoSizeTextArea';

export type TextResourceValueEditorProps = {
  textResourceId: string;
  onTextChange?: (value: string) => void;
  textResourceValue?: string;
};

const language = DEFAULT_LANGUAGE;

const findTextResource = (textResources: ITextResources, id: string) =>
  textResources?.[language]?.find((resource) => resource.id === id);

const getTextResourceValue = (textResources: ITextResources, id: string) =>
  findTextResource(textResources, id)?.value;

export const TextResourceValueEditor = ({
  textResourceId,
  onTextChange,
  textResourceValue,
}: TextResourceValueEditorProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  const value = getTextResourceValue(textResources, textResourceId);
  const minHeightInPx = 100;
  const maxHeightInPx = 400;
  const displayValue = textResourceValue ?? value ?? '';
  const textareaRef = useAutoSizeTextArea(displayValue, {
    minHeightInPx,
    maxHeightInPx,
  });
  const { t } = useTranslation();

  const handleTextEntryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange?.(e.currentTarget.value);
  };

  return (
    <div className={classes.root}>
      <StudioTextarea
        label={t('ux_editor.text_resource_binding_text')}
        value={displayValue}
        onChange={handleTextEntryChange}
        ref={textareaRef}
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
