import { getLayoutSetIdValidationErrorKey } from 'app-shared/utils/layoutSetsUtils';
import type { LayoutSetResponse } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';

export const useValidateLayoutSetName = () => {
  const { t } = useTranslation();

  const validateLayoutSetName = (
    newLayoutSetId: string,
    layoutSets: LayoutSetResponse[],
    oldLayoutSetId?: string,
  ): string => {
    const validationResult = getLayoutSetIdValidationErrorKey(
      newLayoutSetId,
      layoutSets,
      oldLayoutSetId,
    );
    return validationResult ? t(validationResult) : '';
  };

  return { validateLayoutSetName };
};
