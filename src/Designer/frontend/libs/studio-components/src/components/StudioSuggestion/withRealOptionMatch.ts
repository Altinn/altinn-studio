import type { SuggestionProps } from '@digdir/designsystemet-react';

type BeforeMatchHandler = NonNullable<SuggestionProps['onBeforeMatch']>;

const EMPTY_STATE_ATTRIBUTE = 'data-empty';

/**
 * Designsystemet 1.23.0 labels the empty-state option with the typed text, so the combobox's
 * matching on Enter finds that option, whose value is empty, before a real option. Match the
 * real options instead, and let a creatable field keep the empty-state option when none matches.
 * Preventing the match makes the combobox use the option marked as selected.
 */
export function withRealOptionMatch(
  onBeforeMatch: BeforeMatchHandler | undefined,
  creatable: boolean | undefined,
): BeforeMatchHandler {
  return (event): void => {
    onBeforeMatch?.(event);
    if (event.defaultPrevented || !event.detail?.hasAttribute(EMPTY_STATE_ATTRIBUTE)) return;
    const options = Array.from(event.currentTarget.options ?? []);
    const text = event.currentTarget.control?.value.trim().toLowerCase();
    const match = options.find(
      (option) =>
        !option.hasAttribute(EMPTY_STATE_ATTRIBUTE) && option.label.trim().toLowerCase() === text,
    );
    if (!match && creatable) return;
    event.preventDefault();
    for (const option of options) option.selected = option === match;
  };
}
