import { useRef } from 'react';
import type { ReactNode } from 'react';

import { ConfirmPopover } from '@app/form-component/app-components/ConfirmPopover';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelComponent } from '@app/form-component/layout-components/common/LabelComponent';
import { optionFilter } from '@app/form-component/layout-components/common/optionFilter';
import { useAlertOnChange } from '@app/form-component/layout-components/common/useAlertOnChange';
import { getDescriptionId } from '@app/form-component/layout-components/utils/labelIds';
import { EXPERIMENTAL_Suggestion as Suggestion } from '@digdir/designsystemet-react';
import type { IGridStyling } from '@app/form-component/app-components/Flex';
import type { SuggestionItem } from '@digdir/designsystemet-react';

import classes from './MultipleSelectLayout.module.css';

export interface MultipleSelectOption {
  /** The value stored in the data model when this option is selected. */
  value: string;
  /** Text-resource key for the option's label. */
  label: string;
  /** Text-resource key for an optional secondary description shown under the label. */
  description?: string;
}

export interface MultipleSelectProps {
  /** The configured component id (Studio "Komponent-ID"). Rendered as the input's `id` and the label's `htmlFor`. */
  componentId: string;
  /** The selectable options. Labels/descriptions are text-resource keys resolved by this component. */
  options: MultipleSelectOption[];
  /** The currently selected values (the data-model values). Empty array means nothing is selected. */
  values: string[];
  /** Called with the new values when the selection changes (after confirmation when `alertOnChange`). */
  onChange?: (values: string[]) => void;
  /** Called when the input loses focus (used by the wrapper to flush debounced form data). */
  onBlur?: () => void;
  readOnly?: boolean;
  required?: boolean;
  /** Whether the current values are valid. Drives `aria-invalid`. Defaults to `true`. */
  isValid?: boolean;
  /** Show a confirmation popover before removing already-selected values. */
  alertOnChange?: boolean;
  /** Text-resource key for the label text. */
  title?: string;
  /** Text-resource key for the label help text. */
  help?: string;
  /** Text-resource key for the label description. */
  description?: string;
  /** Whether to show the optional marking on the label for non-required fields. */
  showOptionalMarking?: boolean;
  /** Grid sizing for the label. */
  labelGrid?: IGridStyling;
  /**
   * Whether the component is rendered inside a table cell. When true the visible label is suppressed
   * and an `aria-label` is rendered instead (DS Combobox does not honour `aria-label` on the input
   * directly — see digdir/designsystemet#3893).
   */
  renderedInTable?: boolean;
  /** Whether to render the visible label at all. Defaults to `true`. */
  renderLabel?: boolean;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages. */
  validationGrid?: IGridStyling;
  /**
   * Rendered validation messages. The app owns validation, so it passes the already-rendered
   * messages in rather than this library reaching into app-specific validation state.
   */
  validationMessages?: ReactNode;
}

function noop() {}

export function MultipleSelect({
  componentId,
  options,
  values,
  onChange = noop,
  onBlur,
  readOnly,
  required,
  isValid = true,
  alertOnChange,
  title,
  help,
  description,
  showOptionalMarking,
  labelGrid,
  renderedInTable,
  renderLabel,
  innerGrid,
  validationGrid,
  validationMessages,
}: MultipleSelectProps) {
  const { lang, langAsString } = useTranslation();

  const isPatchingFocus = useRef(false);

  const selectedLabels = values.map((value) => {
    const option = options.find((o) => o.value === value);
    return option ? langAsString(option.label).toLowerCase() : value;
  });

  // Map the selected values to value/label items without mutating the values array.
  const selectedItems: SuggestionItem[] = values.map((value) => {
    const option = options.find((o) => o.value === value);
    return option
      ? { value: option.value, label: langAsString(option.label) }
      : { value, label: value };
  });

  const changeMessageGenerator = (newValues: string[]) => {
    const labelsToRemove = options
      .filter((option) => values.includes(option.value) && !newValues.includes(option.value))
      .map((option) => langAsString(option.label))
      .join(', ');

    return lang('form_filler.multi_select_alert', [labelsToRemove]);
  };

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange, alertMessage } =
    useAlertOnChange<(newValues: string[]) => void>(
      Boolean(alertOnChange),
      onChange,
      // Only alert when removing values
      (newValues) => newValues.length < values.length,
      changeMessageGenerator,
    );

  const toggleValue = (value: string) =>
    values.includes(value) ? values.filter((v) => v !== value) : [...values, value];

  const showVisibleLabel = !renderedInTable && renderLabel !== false;

  return (
    <LabelComponent
      htmlFor={componentId}
      title={showVisibleLabel ? title : undefined}
      help={showVisibleLabel ? help : undefined}
      description={showVisibleLabel ? description : undefined}
      required={required}
      readOnly={readOnly}
      showOptionalMarking={showOptionalMarking}
      grid={labelGrid}
    >
      <ComponentStructure
        componentId={componentId}
        innerGrid={innerGrid}
        validationGrid={validationGrid}
        validationMessages={validationMessages}
      >
        {alertOnChange && (
          <ConfirmPopover
            open={alertOpen}
            onOpenChange={setAlertOpen}
            onConfirm={confirmChange}
            onCancel={cancelChange}
            confirmText={langAsString('form_filler.alert_confirm')}
            cancelText={langAsString('general.cancel')}
            message={alertMessage}
            placement='bottom'
            popoverId={`${componentId}-popover`}
          />
        )}
        <Suggestion
          data-testid='multiple-select-component'
          multiple
          filter={(args) => optionFilter(args, selectedLabels)}
          data-size='sm'
          selected={selectedItems}
          onSelectedChange={(newOptions) => handleChange(newOptions.map((option) => option.value))}
          onBlur={() => onBlur?.()}
          style={{ width: '100%' }}
        >
          <Suggestion.Input
            id={componentId}
            aria-invalid={!isValid}
            aria-label={renderedInTable ? langAsString(title) : undefined}
            aria-describedby={
              !renderedInTable && title && description ? getDescriptionId(componentId) : undefined
            }
            readOnly={readOnly}
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
          />
          <Suggestion.Clear
            aria-label={langAsString('form_filler.clear_selection')}
            popoverTarget={`${componentId}-popover`}
          />
          <Suggestion.List>
            <Suggestion.Empty>{lang('form_filler.no_options_found')}</Suggestion.Empty>
            {options.map((option) => (
              <Suggestion.Option
                key={option.value}
                value={option.value}
                label={langAsString(option.label)}
                onClick={() => handleChange(toggleValue(option.value))}
              >
                <span>
                  <wbr />
                  {lang(option.label)}
                  {option.description && (
                    <span className={classes.optionDescription}>{lang(option.description)}</span>
                  )}
                </span>
              </Suggestion.Option>
            ))}
          </Suggestion.List>
        </Suggestion>
      </ComponentStructure>
    </LabelComponent>
  );
}
