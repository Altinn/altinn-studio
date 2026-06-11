import React from 'react';

import { Datepicker, Label } from '@app/form-component';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function DatepickerComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Datepicker'>) {
  const languageLocale = useCurrentLanguage();
  const { minDate, maxDate, format, timeStamp, readOnly, required, id, dataModelBindings, grid, autocomplete } =
    useItemWhenType(baseComponentId, 'Datepicker');

  const { setValue, formData } = useDataModelBindings(dataModelBindings);

  const { labelText, getRequiredComponent, getOptionalComponent, getHelpTextComponent, getDescriptionComponent } =
    useLabel({ baseComponentId, overrideDisplay });

  return (
    <Label
      htmlFor={id}
      label={labelText}
      grid={grid?.labelGrid}
      required={required}
      requiredIndicator={getRequiredComponent()}
      optionalIndicator={getOptionalComponent()}
      help={getHelpTextComponent()}
      description={getDescriptionComponent()}
    >
      <ComponentStructureWrapper baseComponentId={baseComponentId}>
        <Datepicker
          id={id}
          value={formData.simpleBinding}
          format={format}
          locale={languageLocale}
          minDate={minDate}
          maxDate={maxDate}
          timeStamp={timeStamp}
          readOnly={readOnly}
          required={required}
          autoComplete={autocomplete}
          onValueChange={(isoDateString) => setValue('simpleBinding', isoDateString)}
        />
      </ComponentStructureWrapper>
    </Label>
  );
}
