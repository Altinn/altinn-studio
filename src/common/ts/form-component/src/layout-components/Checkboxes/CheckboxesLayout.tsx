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
  value: string;
  label: string;
  description?: string;
  helpText?: string;
}

export interface CheckboxesProps {
  componentId: string;
  options: CheckboxesOption[];
  value: string[];
  onChange: (value: string, checked: boolean) => void;
  readOnly?: boolean;
  required?: boolean;
  isValid?: boolean;
  alertOnChange?: boolean;
  layout?: LayoutStyle;
  title?: string;
  help?: string;
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

export function Checkboxes({
  componentId,
  options,
  value,
  onChange,
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
