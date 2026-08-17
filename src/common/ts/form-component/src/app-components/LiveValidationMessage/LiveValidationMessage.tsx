import type { ComponentProps } from 'react';

import { ValidationMessage } from '@digdir/designsystemet-react';

type LiveValidationMessageProps = {
  /** Whether the validation message should be shown. */
  show: boolean;
  id?: string;
  /** Politeness of the live region. Defaults to `polite`. */
  live?: 'polite' | 'assertive';
} & ComponentProps<typeof ValidationMessage>;

/**
 * Renders a {@link ValidationMessage} inside an always-present `aria-live` region. Keeping the
 * region mounted (and toggling only the message inside it) is what allows screen readers to
 * announce the message when it appears.
 */
export function LiveValidationMessage({
  show,
  id,
  live = 'polite',
  children,
  ...rest
}: LiveValidationMessageProps) {
  return (
    <div id={id} aria-live={live}>
      {show && <ValidationMessage {...rest}>{children}</ValidationMessage>}
    </div>
  );
}
