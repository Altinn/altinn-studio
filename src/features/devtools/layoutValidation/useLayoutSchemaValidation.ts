import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createLayoutValidator, validateLayoutSet } from 'src/features/devtools/utils/layoutSchemaValidation';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSetId';
import type { LayoutValidationErrors } from 'src/features/devtools/layoutValidation/types';

export function useLayoutSchemaValidation(enabled: boolean): LayoutValidationErrors | undefined {
  const layouts = useLayouts();
  const layoutSetId = useCurrentLayoutSetId() || 'default';

  const { fetchLayoutSchema } = useAppQueries();
  const { data: layoutSchema, isSuccess } = useQuery({
    enabled,
    queryKey: ['fetchLayoutSchema'],
    queryFn: () => fetchLayoutSchema(),
  });

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
