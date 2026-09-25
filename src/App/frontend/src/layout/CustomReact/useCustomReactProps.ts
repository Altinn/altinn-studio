import { useCallback, useMemo } from 'react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { CustomReactComponentProps, CustomReactFormValue } from 'src/features/customReact/types';

const emptyOptions = Object.freeze({});

/**
 * Builds the props passed to an app-provided React component. This is the public contract towards apps, see
 * src/features/customReact/types.ts.
 */
export function useCustomReactProps(baseComponentId: string, summaryMode: boolean): CustomReactComponentProps {
  const { componentName, dataModelBindings, textResourceBindings, readOnly, required, options } = useItemWhenType(
    baseComponentId,
    'CustomReact',
  );
  const id = useIndexedId(baseComponentId);
  const { langAsString } = useLanguage();
  const language = useCurrentLanguage();
  const isValid = useIsValid(baseComponentId);
  const { formData, setValue: setBindingValue } = useDataModelBindings(dataModelBindings, undefined, 'raw');

  const texts = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(textResourceBindings ?? {})) {
      result[key] = langAsString(value);
    }
    return result;
  }, [langAsString, textResourceBindings]);

  const setValue = useCallback(
    (bindingKey: string, value: CustomReactFormValue) => {
      if (!dataModelBindings?.[bindingKey]) {
        window.logError(
          `React component "${componentName}" (component '${baseComponentId}') tried to set a value for the ` +
            `data model binding '${bindingKey}', which is not configured in dataModelBindings`,
        );
        return;
      }
      setBindingValue(bindingKey, value);
    },
    [baseComponentId, componentName, dataModelBindings, setBindingValue],
  );

  return useMemo(
    () => ({
      id,
      formData,
      setValue,
      texts,
      language,
      readOnly: summaryMode || !!readOnly,
      required: !!required,
      isValid,
      summaryMode,
      options: options ?? emptyOptions,
    }),
    [formData, id, isValid, language, options, readOnly, required, setValue, summaryMode, texts],
  );
}
