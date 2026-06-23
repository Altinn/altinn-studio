import React from 'react';
import type { ReactNode } from 'react';

import { AccordionItem, Flex } from '@app/form-component/app-components';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
// NOTE: We intentionally use the raw `Card` from designsystemet here rather than the
// lib's own `AppCard` app-component. This mirrors the runtime Accordion's bare
// `<Card data-color='neutral'>` presentation (no `Card.Block`, default variant).
// `AppCard` was rejected on purpose because it defaults to `variant='tinted'` and
// wraps its content in a `<Card.Block>`, which would change the Accordion's
// appearance. Do not "fix" this import to `AppCard` without accounting for that
// visual difference.
import { Card } from '@digdir/designsystemet-react';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

export interface AccordionProps {
  /** Text resource key or literal string for the accordion title */
  title?: string;
  /** Whether the accordion starts open */
  openByDefault?: boolean;
  /** Rendered child components (in the runtime these are GenericComponent renders) */
  children?: React.ReactNode;
  /** Optional CSS class name passed to the AccordionItem */
  className?: string;
  /**
   * Render the accordion as a bare item, without the surrounding Card.
   * In the runtime this is `true` when the Accordion is inside an AccordionGroup
   * (which provides its own Card wrapper). Defaults to `false` (wrapped in a Card).
   */
  renderAsItem?: boolean;
  /** Id for the surrounding ComponentStructure content wrapper. */
  contentId?: string;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages. */
  validationGrid?: IGridStyling;
  /** Validation messages to render below the accordion. */
  validationMessages?: ReactNode;
}

export function Accordion({
  title,
  openByDefault = false,
  children,
  className,
  renderAsItem,
  contentId,
  innerGrid,
  validationGrid,
  validationMessages,
}: AccordionProps) {
  const { lang } = useTranslation();

  const content = (
    <AccordionItem title={lang(title)} className={className} defaultOpen={openByDefault}>
      <Flex item container spacing={6} alignItems='flex-start'>
        {children}
      </Flex>
    </AccordionItem>
  );

  return (
    <ComponentStructure
      id={contentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={validationMessages}
    >
      {renderAsItem ? content : <Card data-color='neutral'>{content}</Card>}
    </ComponentStructure>
  );
}
