import React, { useLayoutEffect, useRef } from 'react';

import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { useMultiBinding } from 'nextsrc/libs/form-engine/components/Custom/useMultiBinding';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompCustomExternal } from 'src/layout/Custom/config.generated';

function setWcProp(element: HTMLElement, key: string, value: unknown) {
  (element as unknown as Record<string, unknown>)[key] = value;
}

export const Custom = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompCustomExternal;
  const { tagName, textResourceBindings, dataModelBindings } = props;
  const { langAsString } = useLanguage();
  const wcRef = useRef<HTMLElement>(null);

  const { formData, setValue } = useMultiBinding(
    dataModelBindings as Record<string, unknown> | undefined,
    parentBinding,
    itemIndex,
  );

  // Listen for dataChanged events from the web component
  useLayoutEffect(() => {
    const current = wcRef.current;
    if (!current) {
      return;
    }

    const handleChange = (customEvent: Event) => {
      const { value, field } = (customEvent as CustomEvent).detail;
      if (!dataModelBindings?.simpleBinding && !field) {
        throw new Error(
          'If you are not using simpleBinding, you need to include a field in your change event to indicate what datamodel binding you want to save to.',
        );
      }
      if (field) {
        setValue(field, value);
        return;
      }
      setValue('simpleBinding', value);
    };

    current.addEventListener('dataChanged', handleChange);
    return () => {
      current.removeEventListener('dataChanged', handleChange);
    };
  }, [dataModelBindings?.simpleBinding, setValue]);

  // Push texts and bindings to the web component
  useLayoutEffect(() => {
    const current = wcRef.current;
    if (!current) {
      return;
    }

    const texts: Record<string, string> = {};
    if (textResourceBindings) {
      for (const [key, value] of Object.entries(textResourceBindings)) {
        if (typeof value === 'string') {
          texts[key] = langAsString(value);
        }
      }
    }

    setWcProp(current, 'texts', texts);
    setWcProp(current, 'dataModelBindings', dataModelBindings);
  }, [textResourceBindings, dataModelBindings, langAsString]);

  // Push formData to the web component
  useLayoutEffect(() => {
    const current = wcRef.current;
    if (current) {
      setWcProp(current, 'formData', formData);
    }
  }, [formData]);

  if (!tagName) {
    return null;
  }

  return React.createElement(tagName, {
    ref: wcRef,
    'data-testid': tagName,
  });
};
