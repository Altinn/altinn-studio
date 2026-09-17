import React from 'react';

import { MultipleSelect } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useSaveValueToGroup } from 'src/features/saveToGroup/useSaveToGroup';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function MultipleSelectComponent({
  baseComponentId,
  overrideDisplay,
}: PropsFromGenericComponent<'MultipleSelect'>) {
  const config = useComponentConfig(baseComponentId, 'MultipleSelect');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'MultipleSelect');
  const readOnly = useEvalExpression(config.readOnly, Expressions.MultipleSelect.readOnly);
  const required = useEvalExpression(config.required, Expressions.MultipleSelect.required);
  const alertOnChange = useEvalExpression(config.alertOnChange, Expressions.MultipleSelect.alertOnChange);
  const title = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.MultipleSelect.textResourceBindings.title,
  );
  const help = useEvalOptionalText(
    config.textResourceBindings?.help,
    Expressions.MultipleSelect.textResourceBindings.help,
  );
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.MultipleSelect.textResourceBindings.description,
  );

  const isValid = useIsValid(baseComponentId);
  const {
    options,
    isFetching,
    selectedValues: selectedFromSimpleBinding,
    setData,
  } = useGetOptions(baseComponentId, 'multi');
  const groupBinding = useSaveValueToGroup(dataModelBindings);
  const selectedValues = groupBinding.enabled ? groupBinding.selectedValues : selectedFromSimpleBinding;
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  if (isFetching) {
    return <AltinnSpinner />;
  }

  return (
    <MultipleSelect
      componentId={componentId}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
      }))}
      values={selectedValues}
      onChange={(values) => (groupBinding.enabled ? groupBinding.setCheckedValues(values) : setData(values))}
      readOnly={readOnly}
      required={required}
      isValid={isValid}
      alertOnChange={alertOnChange}
      title={title}
      help={help}
      description={description}
      showOptionalMarking={!!config.labelSettings?.optionalIndicator}
      labelGrid={config.grid?.labelGrid}
      renderedInTable={overrideDisplay?.renderedInTable}
      renderLabel={overrideDisplay?.renderLabel}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
}
