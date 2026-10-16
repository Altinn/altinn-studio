import React from 'react';

import { TimePickerLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { useLabelData } from 'src/utils/layout/useLabelData';
import type { PropsFromGenericComponent } from 'src/layout';

export function TimePickerComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'TimePicker'>) {
  const config = useComponentConfig(baseComponentId, 'TimePicker');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'TimePicker');
  const minTime = useEvalExpression(config.minTime, Expressions.TimePicker.minTime);
  const maxTime = useEvalExpression(config.maxTime, Expressions.TimePicker.maxTime);
  const readOnly = useEvalExpression(config.readOnly, Expressions.TimePicker.readOnly);
  const required = useEvalExpression(config.required, Expressions.TimePicker.required);

  const { setValue, formData } = useDataModelBindings(dataModelBindings);
  const value = formData.simpleBinding || '';

  const { title, help, description, showOptionalMarking } = useLabelData({
    baseComponentId,
    overrideDisplay,
  });

  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  return (
    <TimePickerLayout
      componentId={componentId}
      value={value}
      onChange={(v) => setValue('simpleBinding', v)}
      format={config.format}
      minTime={minTime}
      maxTime={maxTime}
      readOnly={readOnly}
      required={required}
      title={title}
      help={help}
      description={description}
      showOptionalMarking={showOptionalMarking}
      labelGrid={config.grid?.labelGrid}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
}
