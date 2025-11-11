import React from 'react';
import type { ITextResource } from 'app-shared/types/global';
import { useTextResourcesSelector } from '../../../../hooks';
import { allTextResourceIdsWithTextSelector } from '../../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useTranslation } from 'react-i18next';
import { StudioSelect } from '@studio/components';

export type TextResourcePickerProps = {
  textResourceId?: string;
  onReferenceChange: (id?: string) => void;
};

export const TextResourcePicker = ({
  textResourceId,
  onReferenceChange,
}: TextResourcePickerProps) => {
  const { t } = useTranslation();
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    allTextResourceIdsWithTextSelector(DEFAULT_LANGUAGE),
  );

  return (
    <StudioSelect
      label={t('ux_editor.search_text_resources_label')}
      onChange={(event) =>
        onReferenceChange(event.target.value === '' ? undefined : event.target.value)
      }
      value={textResourceId}
    >
      <StudioSelect.Option value=''>
        {t('ux_editor.search_text_resources_none')}
      </StudioSelect.Option>
      {textResources.map((option) => (
        <StudioSelect.Option title={option.value} key={option.id} value={option.id}>
          {option.id}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};
