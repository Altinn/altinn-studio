import React from 'react';

import { Datepicker } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { useLabelData } from 'src/utils/layout/useLabelData';
import type { PropsFromGenericComponent } from 'src/layout';

export function DatepickerComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Datepicker'>) {
  const config = useComponentConfig(baseComponentId, 'Datepicker');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'Datepicker');
  const componentId = useIndexedId(baseComponentId);
  const minDate = useEvalExpression(config.minDate, Expressions.Datepicker.minDate);
  const maxDate = useEvalExpression(config.maxDate, Expressions.Datepicker.maxDate);
  const readOnly = useEvalExpression(config.readOnly, Expressions.Datepicker.readOnly);
  const required = useEvalExpression(config.required, Expressions.Datepicker.required);

  const { setValue, formData } = useDataModelBindings(dataModelBindings);

  const { title, help, description, showOptionalMarking } = useLabelData({
    baseComponentId,
    overrideDisplay,
  });
  const { innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  return (
    <Datepicker
      componentId={componentId}
      value={formData.simpleBinding}
      format={config.format}
      minDate={minDate}
      maxDate={maxDate}
      timeStamp={config.timeStamp}
      readOnly={readOnly}
      required={required}
      autoComplete={config.autocomplete}
      onValueChange={(isoDateString) => setValue('simpleBinding', isoDateString)}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
      title={title}
      help={help}
      description={description}
      showOptionalMarking={showOptionalMarking}
      labelGrid={config.grid?.labelGrid}
    />
  );
}
