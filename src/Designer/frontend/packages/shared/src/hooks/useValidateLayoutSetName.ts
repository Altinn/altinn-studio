import { getLayoutSetIdValidationErrorKey } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const useValidateLayoutSetName = () => {
  const { t } = useTranslation();

  const validateLayoutSetName = (
    newLayoutSetId: string,
    layoutSets: LayoutSets,
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
