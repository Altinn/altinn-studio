import type { ReactNode } from 'react';

import { ConditionalWrapper } from '@app/form-component/app-components/ConditionalWrapper';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelContent } from '@app/form-component/layout-components/common/LabelContent';
import { shouldUseRowLayout } from '@app/form-component/layout-components/utils/shouldUseRowLayout';
import { Fieldset, useCheckboxGroup } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { IGridStyling } from '@app/form-component/app-components/Flex';
import type { LayoutStyle } from '@app/form-component/layout-components/utils/shouldUseRowLayout';

import classes from './CheckboxesLayout.module.css';
import { WrappedCheckbox } from './WrappedCheckbox';

export interface CheckboxesOption {
  /** The value stored in the data model when this option is checked. */
  value: string;
  /** Text-resource key for the option's label. */
  label: string;
  /** Text-resource key for an optional description shown under the option label. */
  description?: string;
  /** Text-resource key for an optional help text shown as a tooltip next to the option label. */
  helpText?: string;
}

export interface CheckboxesProps {
  /** The configured component id (Studio "Komponent-ID"). Rendered as the group's `id`. */
  componentId: string;
  /** The selectable options. Labels/descriptions/help texts are text-resource keys resolved here. */
  options: CheckboxesOption[];
  /** The currently checked values (the data-model values). */
  value: string[];
  /**
   * Called when an option is toggled, with the option's value and its new checked state. The caller
   * owns how that translates into a data-model update (replacing a value list, toggling a row in a
   * repeating group, ...), so this reports the toggle rather than the resulting selection.
   */
  onChange?: (value: string, checked: boolean) => void;
  readOnly?: boolean;
  required?: boolean;
  /** Whether the current value is valid. Drives the error state of the checkbox group. Defaults to `true`. */
  isValid?: boolean;
  /** Ask for confirmation before unchecking an option. */
  alertOnChange?: boolean;
  /**
   * How the options are laid out. Defaults to a row for fewer than three options and a column
   * otherwise.
   */
  layout?: LayoutStyle;
  /** Text-resource key for the group legend. */
  title?: string;
  /** Text-resource key for the legend help text. */
  help?: string;
  /** Text-resource key for the group description. */
  description?: string;
  /** Whether to show the optional marking on the legend for non-required groups. */
  showOptionalMarking?: boolean;
  /**
   * Whether to keep the option label visible when the group is rendered in a table with a single
   * option. Without it, that single label is hidden (the table header already names the column).
   */
  showLabelsInTable?: boolean;
  /**
   * Whether the component is rendered inside a table cell. When true the group is labelled with an
   * `aria-label` instead of a visible legend.
   */
  renderedInTable?: boolean;
  /** Whether to render the legend element. Defaults to `true`. */
  renderLegend?: boolean;
  /** Whether to render the legend contents. Defaults to `true`. */
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

export function Checkboxes({
  componentId,
  options,
  value,
  onChange = noop,
  readOnly,
  required,
  isValid = true,
  alertOnChange,
  layout,
  title,
  help,
  description,
  showOptionalMarking,
  showLabelsInTable,
  renderedInTable,
  renderLegend,
  renderLabel,
  innerGrid,
  validationGrid,
  validationMessages,
}: CheckboxesProps) {
  const { lang, langAsString } = useTranslation();

  const horizontal = shouldUseRowLayout({ layout, optionsCount: options.length });
  const hideLabel = renderedInTable === true && options.length === 1 && !showLabelsInTable;
  const ariaLabel = renderedInTable ? langAsString(title) : undefined;

  const { getCheckboxProps } = useCheckboxGroup({
    name: componentId,
    readOnly,
    value,
    error: !isValid,
  });

  return (
    <ComponentStructure
      componentId={componentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={validationMessages}
    >
      <div id={componentId}>
        <Fieldset aria-label={ariaLabel}>
          {renderLegend !== false && (
            <Fieldset.Legend className={classes.legend}>
              <LabelContent
                componentId={componentId}
                label={title}
                readOnly={readOnly}
                required={required}
                help={help}
                showOptionalMarking={showOptionalMarking}
                renderLabel={renderLabel}
              />
            </Fieldset.Legend>
          )}
          {description && (
            <Fieldset.Description
              className={cn({ [classes.visuallyHidden]: renderLegend === false })}
            >
              {lang(description)}
            </Fieldset.Description>
          )}
          <ConditionalWrapper
            condition={horizontal}
            wrapper={(children) => (
              <div data-testid='horizontalWrapper' className={classes.horizontal}>
                {children}
              </div>
            )}
          >
            {options.map((option) => (
              <WrappedCheckbox
                key={`checkbox-${option.value}`}
                componentId={componentId}
                option={option}
                hideLabel={hideLabel}
                alertOnChange={alertOnChange}
                {...getCheckboxProps(option.value)}
                checked={value.includes(option.value)}
                onCheckedChange={(checked) => onChange(option.value, checked)}
              />
            ))}
          </ConditionalWrapper>
        </Fieldset>
      </div>
    </ComponentStructure>
  );
}
