import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import type { FormContainer } from '../types/FormContainer';
import type { FormComponent } from '../types/FormComponent';
import { formItemConfigs } from '../data/formItemConfig';
import type { IToolbarElement } from '../types/global';
import { textResourcesByLanguageSelector } from '../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useTextResourcesSelector } from './useTextResourcesSelector';
import type { ITextResource } from 'app-shared/types/global';
import { getTextResource, getTitleByComponentType } from '../utils/language';

export function useComponentTitle(): (
  formItem: FormComponent | FormContainer | IToolbarElement,
) => string {
  const { t } = useTranslation();
  const getTitleByTextResource = useTextResourceTitle();

  return useCallback(
    (formItem: FormComponent | FormContainer | IToolbarElement) => {
      const titleFromResource =
        'textResourceBindings' in formItem ? getTitleByTextResource(formItem) : null;
      if (titleFromResource) return titleFromResource;

      const getDisplayName = formItemConfigs[formItem.type]?.getDisplayName;
      const componentType = getDisplayName ? getDisplayName(formItem) : formItem.type;
      return getTitleByComponentType(componentType, t);
    },
    [t, getTitleByTextResource],
  );
}

const useTextResourceTitle = (): ((item: FormComponent | FormContainer) => string) => {
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE),
  );
  return useCallback(
    (item: FormComponent | FormContainer) =>
      getTextResource(item.textResourceBindings?.title, textResources),
    [textResources],
  );
};
