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
  value: string;
  label: string;
  description?: string;
}

export interface MultipleSelectProps {
  componentId: string;
  options: MultipleSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  readOnly?: boolean;
  required?: boolean;
  isValid?: boolean;
  alertOnChange?: boolean;
  title?: string;
  help?: string;
  description?: string;
  showOptionalMarking?: boolean;
  labelGrid?: IGridStyling;
  renderedInTable?: boolean;
  renderLabel?: boolean;
  innerGrid?: IGridStyling;
  validationGrid?: IGridStyling;
  validationMessages?: ReactNode;
}

export function MultipleSelect({
  componentId,
  options,
  values,
  onChange,
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
          style={{ width: '100%' }}
        >
          <Suggestion.Input
            id={componentId}
            aria-invalid={!isValid}
            aria-label={renderedInTable && title ? langAsString(title) : undefined}
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

              await customElements.whenDefined('u-combobox');

              setTimeout(() => {
                if (document.activeElement !== input) {
                  return;
                }

                // Tell the next execution of onFocus to ignore the event we are about to fire
                isPatchingFocus.current = true;

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
