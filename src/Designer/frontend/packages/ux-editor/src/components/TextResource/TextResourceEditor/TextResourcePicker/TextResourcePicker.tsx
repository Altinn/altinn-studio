import React from 'react';
import type { ITextResource } from 'app-shared/types/global';
import { useTextResourcesSelector } from '../../../../hooks';
import { allTextResourceIdsWithTextSelector } from '../../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useTranslation } from 'react-i18next';
import { StudioNativeSelect } from 'libs/studio-components-legacy/src';

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
    <StudioNativeSelect
      label={t('ux_editor.search_text_resources_label')}
      onChange={(event) =>
        onReferenceChange(event.target.value === '' ? undefined : event.target.value)
      }
      value={textResourceId}
      size='sm'
    >
      <option value=''>{t('ux_editor.search_text_resources_none')}</option>
      {textResources.map((option) => (
        <option title={option.value} key={option.id} value={option.id}>
          {option.id}
        </option>
      ))}
    </StudioNativeSelect>
  );
};
