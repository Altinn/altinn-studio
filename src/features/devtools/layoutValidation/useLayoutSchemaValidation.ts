import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { createLayoutValidator, validateLayoutSet } from 'src/features/devtools/utils/layoutSchemaValidation';
import { useAppSelector } from 'src/hooks/useAppSelector';
import type { LayoutValidationErrors } from 'src/features/devtools/layoutValidation/types';

export function useLayoutSchemaValidation(enabled: boolean): LayoutValidationErrors | undefined {
  const layouts = useAppSelector((state) => state.formLayout.layouts);
  const layoutSetId = useAppSelector((state) => state.formLayout.layoutSetId) || 'default';

  const { fetchLayoutSchema } = useAppQueries();
  const { data: layoutSchema, isSuccess } = useQuery(['fetchLayoutSchema'], () => fetchLayoutSchema(), { enabled });

  const validator = useMemo(() => {
    if (isSuccess && layoutSchema) {
      return createLayoutValidator(layoutSchema);
    } else {
      return null;
    }
  }, [isSuccess, layoutSchema]);

  return useMemo(() => {
    if (enabled && layouts && validator && layoutSetId) {
      const validationMessages = validateLayoutSet(layoutSetId, layouts, validator);

      for (const [layoutSetId, layoutSet] of Object.entries(validationMessages)) {
        for (const [pageName, layout] of Object.entries(layoutSet)) {
          for (const [id, errors] of Object.entries(layout)) {
            if (errors.length) {
              window.logErrorOnce(
                `Layout configuration errors for component '${layoutSetId}/${pageName}/${id}':\n- ${errors.join(
                  '\n- ',
                )}`,
              );
            }
          }
        }
      }

      return validationMessages;
    }

    return undefined;
  }, [enabled, layouts, validator, layoutSetId]);
}
