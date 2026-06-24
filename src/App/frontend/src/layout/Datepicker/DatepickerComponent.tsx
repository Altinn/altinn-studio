import React from 'react';

import { Datepicker } from '@app/form-component';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useLabelData } from 'src/utils/layout/useLabelData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function DatepickerComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Datepicker'>) {
  const { minDate, maxDate, format, timeStamp, readOnly, required, id, dataModelBindings, grid, autocomplete } =
    useItemWhenType(baseComponentId, 'Datepicker');

  const { setValue, formData } = useDataModelBindings(dataModelBindings);

  const { title, help, description, showOptionalMarking } = useLabelData({
    baseComponentId,
    overrideDisplay,
  });
  const { innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  return (
    <Datepicker
      id={id}
      value={formData.simpleBinding}
      format={format}
      minDate={minDate}
      maxDate={maxDate}
      timeStamp={timeStamp}
      readOnly={readOnly}
      required={required}
      autoComplete={autocomplete}
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
      labelGrid={grid?.labelGrid}
    />
  );
}
