import React from 'react';

import { Checkboxes } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useSaveValueToGroup } from 'src/features/saveToGroup/useSaveToGroup';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const CheckboxContainerComponent = ({
  baseComponentId,
  overrideDisplay,
}: PropsFromGenericComponent<'Checkboxes'>) => {
  const config = useComponentConfig(baseComponentId, 'Checkboxes');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'Checkboxes');
  const readOnly = useEvalExpression(config.readOnly, Expressions.Checkboxes.readOnly);
  const required = useEvalExpression(config.required, Expressions.Checkboxes.required);
  const alertOnChange = useEvalExpression(config.alertOnChange, Expressions.Checkboxes.alertOnChange);
  const title = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.Checkboxes.textResourceBindings.title,
  );
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.Checkboxes.textResourceBindings.help);
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.Checkboxes.textResourceBindings.description,
  );

  const {
    options,
    isFetching,
    setData,
    selectedValues: selectedFromSimpleBinding,
  } = useGetOptions(baseComponentId, 'multi');
  const groupBinding = useSaveValueToGroup(dataModelBindings);
  const selectedValues = groupBinding.enabled ? groupBinding.selectedValues : selectedFromSimpleBinding;

  const isValid = useIsValid(baseComponentId);
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  if (isFetching) {
    return <AltinnSpinner />;
  }

  return (
    <Checkboxes
      componentId={componentId}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
        helpText: option.helpText,
      }))}
      value={selectedValues}
      onChange={(value, checked) => {
        if (groupBinding.enabled) {
          groupBinding.toggleValue(value);
        } else {
          setData(checked ? [...selectedValues, value] : selectedValues.filter((v) => v !== value));
        }
      }}
      readOnly={readOnly}
      required={required}
      isValid={isValid}
      alertOnChange={alertOnChange}
      layout={config.layout}
      title={title}
      help={help}
      description={description}
      showOptionalMarking={!!config.labelSettings?.optionalIndicator}
      showLabelsInTable={config.showLabelsInTable}
      renderedInTable={overrideDisplay?.renderedInTable}
      renderLegend={overrideDisplay?.renderLegend}
      renderLabel={overrideDisplay?.renderLabel}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
};
