import { type ReactElement, type ReactNode, useRef, useState } from 'react';

import {
  EXPERIMENTAL_Suggestion as Suggestion,
  Label as DSLabel,
  Popover,
} from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { SuggestionItem } from '@digdir/designsystemet-react';

// this eslint-disables will be fixed once this PR is merged:
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { Button, HelpText, Label, Spinner } from '../../app-components';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { useTranslation } from '../../LanguageTranslatorProvider';
import classes from './Dropdown.module.css';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import type { IGridStyling } from '../../app-components';

/** A single selectable option. `label`/`description` are text-resource keys, resolved by the lib. */
export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Props that map 1:1 to the component's Studio-configurable options. These are the props an app
 * developer documents and experiments with in Storybook — see {@link DROPDOWN_LAYOUT_CONFIG_KEYS}.
 */
export interface DropdownLayoutConfig {
  /** The component id. */
  id: string;
  /** Text-resource key for the field label. */
  title?: string;
  /** Text-resource key for the description shown below the label. */
  description?: string;
  /** Text-resource key for the help text shown in a tooltip next to the label. */
  help?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Whether the field is read-only. */
  readOnly?: boolean;
  /** Whether to render an "(optional)" marking when the field is not required. */
  showOptionalMarking?: boolean;
  /** When true, a confirmation popover is shown before an existing selection is changed. */
  alertOnChange?: boolean;
  /** Grid sizing for the label. */
  grid?: IGridStyling;
}

/**
 * Internal wiring supplied by the runtime wrapper: options, the selected value, display overrides,
 * validation state and event handlers. These are intentionally NOT part of the Studio configuration
 * and are hidden from the Storybook controls (only {@link DROPDOWN_LAYOUT_CONFIG_KEYS} are shown).
 */
export interface DropdownLayoutControlProps {
  /** The list of selectable options. Labels/descriptions are text-resource keys. */
  options: DropdownOption[];
  /** The currently selected value (guaranteed to exist in `options`). */
  value?: string;
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Whether the options are being fetched; renders a spinner while true. */
  loading?: boolean;
  /** Whether the label should be rendered (defaults to true). */
  renderLabel?: boolean;
  /** When rendered inside a table cell the label is hidden and aria wiring changes. */
  renderedInTable?: boolean;
  /** Called with the new value when the user commits a selection (after confirmation, if enabled). */
  onChange?: (value: string | undefined) => void;
  /** Blur handler for the combobox. */
  onBlur?: () => void;
}

export interface DropdownLayoutProps extends DropdownLayoutConfig, DropdownLayoutControlProps {}

/**
 * The configurable props, derived from {@link DropdownLayoutConfig}. The `satisfies Record<...>` keeps
 * this list exhaustive: adding a prop to `DropdownLayoutConfig` without listing it here is a compile
 * error. Storybook uses it (`controls.include`) to show controls for exactly the configurable props
 * and nothing else.
 */
export const DROPDOWN_LAYOUT_CONFIG_KEYS = Object.keys({
  id: true,
  title: true,
  description: true,
  help: true,
  required: true,
  readOnly: true,
  showOptionalMarking: true,
  alertOnChange: true,
  grid: true,
} satisfies Record<keyof DropdownLayoutConfig, true>) as (keyof DropdownLayoutConfig)[];

function getLabelId(id: string) {
  return `label-${id}`;
}

function getDescriptionId(id: string) {
  return `description-${getLabelId(id)}`;
}

export function DropdownLayout(props: DropdownLayoutProps) {
  const {
    id,
    title,
    description,
    help,
    required,
    readOnly,
    showOptionalMarking,
    alertOnChange,
    grid,
    options,
    value,
    error,
    loading,
    renderLabel = true,
    renderedInTable,
    onChange,
    onBlur,
  } = props;

  const { lang, translate, TranslateComponent } = useTranslation();

  const isPatchingFocus = useRef(false);

  // The alert-on-change interaction: hold a pending value until the user confirms or cancels.
  const [alertOpen, setAlertOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<string | undefined>(undefined);
  const [alertMessage, setAlertMessage] = useState<ReactNode>('');

  const optionLabel = (val: string | undefined) => {
    const option = val !== undefined ? options.find((o) => o.value === val) : undefined;
    return option ? translate(option.label) : (val ?? '');
  };

  const selectedLabels = value ? [optionLabel(value).toLowerCase()] : [];

  const commit = (newValue: string | undefined) => {
    const shouldAlert = Boolean(alertOnChange) && newValue !== value && !!value;
    if (shouldAlert) {
      setPendingValue(newValue);
      setAlertMessage(lang('form_filler.dropdown_alert', [optionLabel(newValue)]));
      setAlertOpen(true);
      return;
    }
    onChange?.(newValue);
  };

  const confirmChange = () => {
    setAlertOpen(false);
    setAlertMessage('');
    onChange?.(pendingValue);
    setPendingValue(undefined);
  };

  const cancelChange = () => {
    setPendingValue(undefined);
    setAlertOpen(false);
    setAlertMessage('');
  };

  function optionFilter(args: {
    label?: string;
    text: string;
    optionElement?: HTMLOptionElement;
    input: HTMLInputElement;
  }): boolean {
    const { optionElement, input, text, label } = args;
    const search = input.value.toLowerCase();
    const labelLower = (label || text).toLowerCase();
    const desc = optionElement?.getAttribute('aria-description')?.toLowerCase();

    // Show all options if no search text is entered or a selected values label is equal to the search text
    if (
      !search ||
      (selectedLabels.length > 0 && selectedLabels.some((l) => l.toLowerCase() === search))
    ) {
      return true;
    }

    return labelLower.includes(search) || (!!desc && desc.includes(search));
  }

  function formatSelectedValue(): SuggestionItem | undefined {
    const option = value !== undefined ? options.find((o) => o.value === value) : undefined;
    return option ? { value: option.value, label: translate(option.label) } : undefined;
  }

  if (loading) {
    return (
      <div data-testid='altinn-spinner'>
        <Spinner role='progressbar' aria-label={translate('general.loading')} />
      </div>
    );
  }

  const labelId = getLabelId(id);
  const descriptionId = getDescriptionId(id);

  const shouldShowLabel = renderLabel && renderedInTable !== true && !!title;
  const labelText = shouldShowLabel ? lang(title) : undefined;

  const requiredIndicator: ReactElement | undefined = required ? (
    <span> {translate('form_filler.required_label')}</span>
  ) : undefined;

  const optionalIndicator: ReactElement | undefined =
    !required && showOptionalMarking && !readOnly ? (
      <span className={classes.optionalIndicator}>{` (${translate('general.optional')})`}</span>
    ) : undefined;

  const helpComponent: ReactElement | undefined = help ? (
    <HelpText
      id={`${id}-helptext`}
      titlePrefix={title ? translate('helptext.button_title_prefix') : undefined}
      title={title ? translate(title) : translate('helptext.button_title')}
    >
      <TranslateComponent tKey={help} />
    </HelpText>
  ) : undefined;

  const descriptionComponent: ReactElement | undefined = description ? (
    <span id={descriptionId} data-testid={descriptionId}>
      {lang(description)}
    </span>
  ) : undefined;

  return (
    <Label
      id={labelId}
      htmlFor={id}
      label={labelText as ReactElement | string | undefined}
      grid={grid}
      required={required}
      requiredIndicator={requiredIndicator}
      optionalIndicator={optionalIndicator}
      help={helpComponent}
      description={descriptionComponent}
    >
      {alertOnChange && (
        <Popover.TriggerContext>
          <Popover.Trigger asChild onClick={() => setAlertOpen(!alertOpen)} />
          <Popover
            data-testid='delete-warning-popover'
            id={`${id}-popover`}
            open={alertOpen}
            placement='bottom'
            data-color='warning'
          >
            <div>{alertMessage}</div>
            <div className={classes.popoverButtonContainer}>
              <Button color='danger' onClick={confirmChange}>
                {translate('form_filler.alert_confirm')}
              </Button>
              <Button variant='tertiary' color='second' onClick={cancelChange}>
                {translate('general.cancel')}
              </Button>
            </div>
          </Popover>
        </Popover.TriggerContext>
      )}
      {renderedInTable && (
        // Setting aria-label on the input component does not work in DS Combobox.
        // Workaround until this issue is resolved in DS: https://github.com/digdir/designsystemet/issues/3893
        <DSLabel htmlFor={id} className='sr-only'>
          {lang(title)}
          {description && lang(description)}
        </DSLabel>
      )}
      <Suggestion
        multiple={false}
        filter={optionFilter}
        data-size='sm'
        selected={formatSelectedValue()}
        onSelectedChange={(option) => commit(option ? option.value : undefined)}
        onBlur={onBlur}
        name={renderedInTable && title ? translate(title) : undefined}
        className={cn(classes.container, classes.showCaretsWithoutClear, {
          [classes.readOnly]: readOnly,
        })}
        style={{ width: '100%' }}
      >
        <Suggestion.Input
          id={id}
          aria-invalid={error}
          onFocus={async (e) => {
            // Workaround for when programmatically focused by repeating group focus management

            // If this event was triggered by our code below, reset the flag and exit.
            if (isPatchingFocus.current) {
              isPatchingFocus.current = false;
              return;
            }

            const input = e.target;

            // Wait for the combobox to be fully defined
            await customElements.whenDefined('u-combobox');

            setTimeout(() => {
              // Ensure we are still the active element
              if (document.activeElement !== input) {
                return;
              }

              // Tell the next execution of onFocus to ignore the event we are about to fire
              isPatchingFocus.current = true;

              // Wake up the component
              input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
            }, 150);
          }}
          aria-label={renderedInTable && title ? translate(title) : undefined}
          aria-describedby={
            renderedInTable !== true && title && description ? descriptionId : undefined
          }
          readOnly={readOnly}
        />
        <Suggestion.List>
          <Suggestion.Empty>{lang('form_filler.no_options_found')}</Suggestion.Empty>
          {options.map((option) => (
            <Suggestion.Option
              key={option.value}
              value={option.value}
              label={translate(option.label)}
              onClick={() => commit(option.value)}
            >
              <span className={classes.optionContent}>
                {lang(option.label)}
                {option.description && lang(option.description)}
              </span>
            </Suggestion.Option>
          ))}
        </Suggestion.List>
        <span popoverTarget={`${id}-popover`} />
      </Suggestion>
    </Label>
  );
}
