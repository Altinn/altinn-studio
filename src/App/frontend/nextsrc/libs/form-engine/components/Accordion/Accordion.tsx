import React from 'react';

import { AccordionItem } from 'src/app-components/Accordion/AccordionItem';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { asTranslationKey } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompAccordionExternal } from 'src/layout/Accordion/config.generated';

export const Accordion = ({ component, renderChildren }: ComponentProps) => {
  const props = component as unknown as CompAccordionExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const children = component.children ?? [];

  return (
    <AccordionItem title={asTranslationKey(titleKey) ?? (title as never)}>
      {renderChildren(children)}
    </AccordionItem>
  );
};
