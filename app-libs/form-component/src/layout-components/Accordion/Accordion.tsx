import React from 'react';

import { AccordionItem, Flex } from '@app/form-component/app-components';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
// NOTE: We intentionally use the raw `Card` from designsystemet here rather than the
// lib's own `AppCard` app-component. This mirrors the runtime Accordion's bare
// `<Card data-color='neutral'>` presentation (no `Card.Block`, default variant).
// `AppCard` was rejected on purpose because it defaults to `variant='tinted'` and
// wraps its content in a `<Card.Block>`, which would change the Accordion's
// appearance. Do not "fix" this import to `AppCard` without accounting for that
// visual difference.
import { Card } from '@digdir/designsystemet-react';

export interface AccordionProps {
  /** Component ID, used for test IDs */
  id?: string;
  /** Text resource key or literal string for the accordion title */
  title?: string;
  /** Whether the accordion starts open */
  openByDefault?: boolean;
  /** Rendered child components (in the runtime these are GenericComponent renders) */
  children?: React.ReactNode;
  /** Optional CSS class name passed to the AccordionItem */
  className?: string;
  /**
   * Whether to wrap the accordion in a Card component.
   * In the runtime, this is `true` when the Accordion is NOT inside an AccordionGroup
   * (since AccordionGroup provides its own Card wrapper).
   * Defaults to `true`.
   */
  renderAsCard?: boolean;
}

export function Accordion({
  id,
  title,
  openByDefault = false,
  children,
  className,
  renderAsCard = true,
}: AccordionProps) {
  const { lang } = useTranslation();

  const content = (
    <AccordionItem title={lang(title)} className={className} defaultOpen={openByDefault}>
      <Flex item container spacing={6} alignItems='flex-start'>
        {children}
      </Flex>
    </AccordionItem>
  );

  const inner = renderAsCard ? <Card data-color='neutral'>{content}</Card> : content;

  // Only introduce the wrapper element when it carries a test id. This avoids
  // shipping a semantically empty `<div data-testid={undefined}>` when `id` is
  // omitted, and keeps the DOM closer to the runtime's output.
  return id ? <div data-testid={`accordion-component-${id}`}>{inner}</div> : inner;
}
