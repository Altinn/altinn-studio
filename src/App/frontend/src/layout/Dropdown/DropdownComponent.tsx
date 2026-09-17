import React from 'react';

import { Dropdown } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function DropdownComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Dropdown'>) {
  const config = useComponentConfig(baseComponentId, 'Dropdown');
  const readOnly = useEvalExpression(config.readOnly, Expressions.Dropdown.readOnly);
  const required = useEvalExpression(config.required, Expressions.Dropdown.required);
  const alertOnChange = useEvalExpression(config.alertOnChange, Expressions.Dropdown.alertOnChange);
  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.Dropdown.textResourceBindings.title);
  const help = useEvalExpression(config.textResourceBindings?.help, Expressions.Dropdown.textResourceBindings.help);
  const description = useEvalExpression(
    config.textResourceBindings?.description,
    Expressions.Dropdown.textResourceBindings.description,
  );

  const isValid = useIsValid(baseComponentId);
  const { options, isFetching, selectedValues, setData } = useGetOptions(baseComponentId, 'single');
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  if (isFetching) {
    return <AltinnSpinner />;
  }

  return (
    <Dropdown
      componentId={componentId}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
      }))}
      value={selectedValues.at(0) ?? ''}
      onChange={(value) => setData(value ? [value] : [])}
      readOnly={readOnly}
      required={required}
      isValid={isValid}
      alertOnChange={alertOnChange}
      title={config.textResourceBindings?.title === undefined ? undefined : title}
      help={config.textResourceBindings?.help === undefined ? undefined : help}
      description={config.textResourceBindings?.description === undefined ? undefined : description}
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
