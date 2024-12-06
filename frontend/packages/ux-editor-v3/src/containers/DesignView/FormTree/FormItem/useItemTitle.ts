import type { ITextResource } from 'app-shared/types/global';
import { useTextResourcesSelector } from '../../../../hooks';
import { textResourcesByLanguageSelector } from '../../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useCallback } from 'react';
import { getTextResource } from '../../../../utils/language';
import { useComponentTypeName } from '../../../../hooks/useComponentTypeName';
import type { FormComponent } from '../../../../types/FormComponent';
import type { FormContainer } from '../../../../types/FormContainer';

export const useItemTitle = (): ((item: FormComponent | FormContainer) => string) => {
  const componentTitle = useComponentTitle();
  const componentTypeName = useComponentTypeName();

  return useCallback(
    (item: FormComponent | FormContainer) => {
      const customTitle = componentTitle(item);
      return customTitle || componentTypeName(item.type);
    },
    [componentTitle, componentTypeName],
  );
};

const useComponentTitle = (): ((item: FormComponent | FormContainer) => string) => {
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE),
  );
  return useCallback(
    (item: FormComponent | FormContainer) =>
      getTextResource(item.textResourceBindings?.title, textResources),
    [textResources],
  );
};
