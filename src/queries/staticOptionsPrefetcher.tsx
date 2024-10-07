import React, { useMemo } from 'react';

import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useGetOptionsQueryDef } from 'src/features/options/useGetOptionsQuery';
import { duplicateStringFilter } from 'src/utils/stringHelper';
import { getOptionsUrl } from 'src/utils/urls/appUrlHelper';
import type { ISelectionComponent } from 'src/layout/common.generated';
import type { ParamValue } from 'src/utils/urls/appUrlHelper';

type O = ISelectionComponent;

export function StaticOptionPrefetcher() {
  const layouts = useLayouts();
  const language = useCurrentLanguage();
  const instanceId = useLaxInstanceId();

  const optionUrls: string[] = useMemo(
    () =>
      Object.values(layouts)
        .flatMap(
          (layout) =>
            layout?.filter(
              // Iterate all components
              (c) =>
                (c as O).optionsId && // Check that optionsId exists
                !(c as O).mapping && // Check that no mapping exists (not dynamic)
                (!(c as O).queryParameters || // Check that there are only static parameters (no expressions)
                  Object.values((c as O).queryParameters!).every(
                    (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null,
                  )),
            ) ?? [],
        )
        .map((c) =>
          getOptionsUrl({
            instanceId,
            language,
            optionsId: (c as O).optionsId!,
            queryParameters: (c as O).queryParameters as Record<string, ParamValue>,
            secure: (c as O).secure,
          }),
        )
        .filter(duplicateStringFilter),
    [instanceId, language, layouts],
  );

  return (
    <>
      {optionUrls.map((url) => (
        <FetchStaticOption
          key={url}
          url={url}
        />
      ))}
    </>
  );
}

function FetchStaticOption({ url }: { url: string }) {
  usePrefetchQuery(useGetOptionsQueryDef(url));
  return null;
}
