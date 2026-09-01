import { useRef } from 'react';
import type { ReactNode } from 'react';

import { ConfirmPopover } from '@app/form-component/app-components/ConfirmPopover';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelComponent } from '@app/form-component/layout-components/common/LabelComponent';
import { optionFilter } from '@app/form-component/layout-components/common/optionFilter';
import { useAlertOnChange } from '@app/form-component/layout-components/common/useAlertOnChange';
import { getDescriptionId } from '@app/form-component/layout-components/utils/labelIds';
import comboboxClasses from '@app/form-component/styles/combobox.module.css';
import { EXPERIMENTAL_Suggestion as Suggestion } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { IGridStyling } from '@app/form-component/app-components/Flex';
import type { SuggestionItem } from '@digdir/designsystemet-react';

import classes from './DropdownLayout.module.css';

export interface DropdownOption {
  /** The value stored in the data model when this option is selected. */
  value: string;
  /** Text-resource key for the option's label. */
  label: string;
  /** Text-resource key for an optional secondary description shown under the label. */
  description?: string;
}

export interface DropdownProps {
  /** The configured component id (Studio "Komponent-ID"). Rendered as the input's `id` and the label's `htmlFor`. */
  componentId: string;
  /** The selectable options. Labels/descriptions are text-resource keys resolved by this component. */
  options: DropdownOption[];
  /** The currently selected value (the data-model value). Empty string means nothing is selected. */
  value: string;
  /** Called with the new value when the selection changes (after confirmation when `alertOnChange`). */
  onChange?: (value: string) => void;
  /** Called when the input loses focus (used by the wrapper to flush debounced form data). */
  onBlur?: () => void;
  readOnly?: boolean;
  required?: boolean;
  /** Whether the current value is valid. Drives `aria-invalid`. Defaults to `true`. */
  isValid?: boolean;
  /** Show a confirmation popover before overwriting an existing selection. */
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
   * and a visually-hidden label + `aria-label` are rendered instead (DS Combobox does not honor
   * `aria-label` on the input directly — see digdir/designsystemet#3893).
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

export function Dropdown({
  componentId,
  options,
  value,
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
}: DropdownProps) {
  const { lang, langAsString } = useTranslation();

  const isPatchingFocus = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabels = value
    ? [(selectedOption ? langAsString(selectedOption.label) : value).toLowerCase()]
    : [];

  const selectedItem: SuggestionItem | undefined =
    value && selectedOption
      ? { value: selectedOption.value, label: langAsString(selectedOption.label) }
      : undefined;

  const changeMessageGenerator = (newValue: string) => {
    const label = options
      .filter((option) => option.value === newValue)
      .map((option) => langAsString(option.label))
      .join(', ');

    return lang('form_filler.dropdown_alert', [label]);
  };

  const shouldAlertOnChange = (newValue: string) => newValue !== value && !!value;

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange, alertMessage } =
    useAlertOnChange<(newValue: string) => void>(
      Boolean(alertOnChange),
      onChange,
      shouldAlertOnChange,
      changeMessageGenerator,
    );

  function handleSelectedChange(option?: SuggestionItem | null) {
    const newValue = option?.value ?? '';

    if (alertOnChange && shouldAlertOnChange(newValue) && inputRef.current) {
      // Suggestion updates its internal match before proposing a controlled value. When the proposal
      // is suspended, restore the accepted value synchronously so a subsequent blur does not propose
      // the rejected match a second time and reopen the confirmation popover.
      inputRef.current.value = selectedItem?.label ?? '';
      // A plain input event refreshes u-combobox's match without selecting it again.
      inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    }

    handleChange(newValue);
  }

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
          multiple={false}
          filter={(args) => optionFilter(args, selectedLabels)}
          data-size='sm'
          selected={selectedItem}
          onSelectedChange={handleSelectedChange}
          onBlur={() => onBlur?.()}
          className={cn(comboboxClasses.container, classes.showCaretsWithoutClear, {
            [classes.readOnly]: readOnly,
          })}
          style={{ width: '100%' }}
        >
          <Suggestion.Input
            ref={inputRef}
            id={componentId}
            aria-invalid={!isValid}
            onFocus={async (e) => {
              // Workaround for when programmatically focused by repeating group focus management

              // If this event was triggered by our code below, reset the flag and exit.
              if (isPatchingFocus.current) {
                isPatchingFocus.current = false;
                return;
              }

              const input = e.target;

              await customElements.whenDefined('u-combobox');

              setTimeout(() => {
                if (document.activeElement !== input) {
                  return;
                }

                isPatchingFocus.current = true;

                input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
              }, 150);
            }}
            aria-label={renderedInTable ? langAsString(title) : undefined}
            aria-describedby={
              !renderedInTable && title && description ? getDescriptionId(componentId) : undefined
            }
            readOnly={readOnly}
          />
          <Suggestion.List>
            <Suggestion.Empty>{lang('form_filler.no_options_found')}</Suggestion.Empty>
            {options.map((option) => (
              <Suggestion.Option
                key={option.value}
                value={option.value}
                label={langAsString(option.label)}
              >
                <span className={classes.optionContent}>
                  {lang(option.label)}
                  {option.description && lang(option.description)}
                </span>
              </Suggestion.Option>
            ))}
          </Suggestion.List>
          <span popoverTarget={`${componentId}-popover`} />
        </Suggestion>
      </ComponentStructure>
    </LabelComponent>
  );
}
