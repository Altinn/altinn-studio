import type { LegacySingleSelectOption } from '@digdir/design-system-react';
import { LegacySelect } from '@digdir/design-system-react';
import React from 'react';
import { prepend } from 'app-shared/utils/arrayUtils';
import type { ITextResource } from 'app-shared/types/global';
import { useTextResourcesSelector } from '../../../../hooks';
import {
  allTextResourceIdsWithTextSelector,
  textResourceByLanguageAndIdSelector,
} from '../../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useTranslation } from 'react-i18next';
import { TextResourceOption } from './TextResourceOption';

export type TextResourcePickerProps = {
  textResourceId?: string;
  onReferenceChange: (id?: string) => void;
};

export const TextResourcePicker = ({
  textResourceId,
  onReferenceChange,
}: TextResourcePickerProps) => {
  const { t } = useTranslation();
  const textResource: ITextResource = useTextResourcesSelector<ITextResource>(
    textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, textResourceId),
  );
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    allTextResourceIdsWithTextSelector(DEFAULT_LANGUAGE),
  );

  const searchOptions: LegacySingleSelectOption[] = prepend<LegacySingleSelectOption>(
    textResources.map((tr) => ({
      label: tr.id,
      value: tr.id,
      formattedLabel: <TextResourceOption textResource={tr} />,
      keywords: [tr.id, tr.value],
    })),
    { label: t('ux_editor.search_text_resources_none'), value: '' },
  );

  return (
    <LegacySelect
      hideLabel={true}
      label={t('ux_editor.search_text_resources_label')}
      onChange={(id) => onReferenceChange(id === '' ? undefined : id)}
      options={searchOptions}
      value={textResource?.id ?? ''}
    />
  );
};
