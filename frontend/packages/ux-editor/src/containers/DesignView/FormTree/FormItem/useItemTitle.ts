import type { ITextResource } from 'app-shared/types/global';
import { useTextResourcesSelector } from '../../../../hooks';
import { textResourcesByLanguageSelector } from '../../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { getTextResource } from '../../../../utils/language';
import { useComponentTypeName } from '../../../../hooks/useComponentTypeName';
import type { FormComponent } from '../../../../types/FormComponent';
import type { FormContainer } from '../../../../types/FormContainer';

export const useItemTitle = (): ((item: FormComponent | FormContainer) => string) => {
  const containerTitle = useContainerTitle();
  const componentTitle = useComponentTitle();
  const componentTypeName = useComponentTypeName();

  return useCallback(
    (item: FormComponent | FormContainer) => {
      if (item.itemType === 'CONTAINER') return containerTitle(item.id);
      else {
        const customTitle = componentTitle(item);
        return customTitle || componentTypeName(item.type);
      }
    },
    [containerTitle, componentTitle, componentTypeName],
  );
};

const useComponentTitle = (): ((item: FormComponent) => string) => {
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE),
  );
  return useCallback(
    (item: FormComponent) => getTextResource(item.textResourceBindings?.title, textResources),
    [textResources],
  );
};

const useContainerTitle = (): ((id: string) => string) => {
  const { t } = useTranslation();
  return useCallback((id: string) => t('ux_editor.component_group_header', { id }), [t]);
};
