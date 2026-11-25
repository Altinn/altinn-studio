import type { ReactNode } from 'react';

import { Fieldset } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { ConditionalWrapper } from '../../app-components/ConditionalWrapper';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { ComponentStructure } from '../common/ComponentStructure';
import { LabelContent } from '../common/LabelContent';
import { shouldUseRowLayout } from '../utils/shouldUseRowLayout';
import classes from './RadioButtonsLayout.module.css';
import { WrappedRadio } from './WrappedRadio';
import type { IGridStyling } from '../../app-components/Flex';
import type { LayoutStyle } from '../utils/shouldUseRowLayout';

export interface RadioButtonsOption {
  value: string;
  /** Text-resource key for the option label. */
  label: string;
  /** Text-resource key for the option description. */
  description?: string;
  /** Text-resource key for the option help text. */
  helpText?: string;
}

export interface RadioButtonsLayoutProps {
  componentId: string;
  options: RadioButtonsOption[];
  /** The selected option value, or undefined when nothing is selected. */
  value: string | undefined;
  onChange: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  isValid?: boolean;
  /** Asks the user to confirm before changing an existing selection. */
  alertOnChange?: boolean;
  layout?: LayoutStyle;
  showAsCard?: boolean;
  /** Text-resource key for the legend. */
  title?: string;
  /** Text-resource key rendered before the title, such as a Likert column header. */
  titlePrefix?: string;
  /** Text-resource key for the help text. */
  help?: string;
  /** Text-resource key for the description. */
  description?: string;
  showOptionalMarking?: boolean;
  showLabelsInTable?: boolean;
  renderedInTable?: boolean;
  renderLegend?: boolean;
  renderLabel?: boolean;
  innerGrid?: IGridStyling;
  validationGrid?: IGridStyling;
  validationMessages?: ReactNode;
}

export function RadioButtonsLayout({
  componentId,
  options,
  value,
  onChange,
  readOnly,
  required,
  isValid = true,
  alertOnChange,
  layout,
  showAsCard,
  title,
  titlePrefix,
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
}: RadioButtonsLayoutProps) {
  const { lang, langAsString } = useTranslation();

  const horizontal = shouldUseRowLayout({ layout, optionsCount: options.length });
  const hideLabel = renderedInTable === true && options.length === 1 && !showLabelsInTable;
  const showLegend = renderLegend !== false;

  // Only ask for confirmation when the change replaces an existing selection.
  const shouldAlert = Boolean(alertOnChange) && !!value;
  const selectedLabel = options.find((option) => option.value === value)?.label;
  const alertMessage = selectedLabel
    ? lang('form_filler.radiobutton_alert_label', [
        `<strong>${langAsString(selectedLabel)}</strong>`,
      ])
    : null;

  return (
    <ComponentStructure
      componentId={componentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={validationMessages}
    >
      <div id={componentId}>
        <Fieldset role='radiogroup' aria-label={showLegend ? undefined : langAsString(title)}>
          {showLegend && (
            <Fieldset.Legend className={classes.legend}>
              <LabelContent
                componentId={componentId}
                label={title}
                labelPrefix={titlePrefix}
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
              className={cn(classes.description, { [classes.visuallyHidden]: !showLegend })}
            >
              {lang(description)}
            </Fieldset.Description>
          )}
          <ConditionalWrapper
            condition={horizontal}
            wrapper={(children) => <div className={classes.inlineRadioGroup}>{children}</div>}
          >
            {options.map((option) => (
              <WrappedRadio
                key={option.value}
                componentId={componentId}
                option={option}
                checked={option.value === value}
                onSelect={onChange}
                readOnly={readOnly}
                isValid={isValid}
                hideLabel={hideLabel}
                showAsCard={showAsCard}
                alertOnChange={shouldAlert}
                alertMessage={alertMessage}
              />
            ))}
          </ConditionalWrapper>
        </Fieldset>
      </div>
    </ComponentStructure>
  );
}
