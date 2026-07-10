import React from 'react';

import { TimePickerLayout } from '@app/form-component';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useLabelData } from 'src/utils/layout/useLabelData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function TimePickerComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'TimePicker'>) {
  const { minTime, maxTime, format, readOnly, required, dataModelBindings, grid } = useItemWhenType(
    baseComponentId,
    'TimePicker',
  );

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
      format={format}
      minTime={minTime}
      maxTime={maxTime}
      readOnly={readOnly}
      required={required}
      title={title}
      help={help}
      description={description}
      showOptionalMarking={showOptionalMarking}
      labelGrid={grid?.labelGrid}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
}
