import React from 'react';

import { RadioButtonsLayout } from '@app/form-component';
import { CommonExpressions, Expressions } from '@app/layout-contract/generated/expressions.generated';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { FormStore } from 'src/features/form/FormContext';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression, useEvalOptionalTrb } from 'src/utils/layout/useEvalExpression';
import { useShowOptionalIndicator } from 'src/utils/layout/useShowOptionalIndicator';
import type { PropsFromGenericComponent } from 'src/layout';

export const ControlledRadioGroup = (props: PropsFromGenericComponent<'RadioButtons' | 'LikertItem'>) => {
  const { baseComponentId, overrideDisplay } = props;
  const isValid = useIsValid(baseComponentId);
  const config = useComponentConfig<'RadioButtons' | 'LikertItem'>(
    baseComponentId,
    (t) => t === 'RadioButtons' || t === 'LikertItem',
  );
  const readOnly = useEvalExpression('readOnly' in config ? config.readOnly : undefined, CommonExpressions.readOnly);
  const required = useEvalExpression('required' in config ? config.required : undefined, CommonExpressions.required);
  const title = useEvalOptionalTrb(config, 'title', CommonExpressions.TRBLabel);
  const help = useEvalOptionalTrb(config, 'help', CommonExpressions.TRBLabel);
  const description = useEvalOptionalTrb(config, 'description', CommonExpressions.TRBLabel);
  const alertOnChange = useEvalExpression(
    'alertOnChange' in config ? config.alertOnChange : undefined,
    Expressions.RadioButtons.alertOnChange,
  );
  const showOptionalMarking = useShowOptionalIndicator('labelSettings' in config ? config.labelSettings : undefined);
  const { selectedValues, handleChangeRadioGroup, fetchingOptions, calculatedOptions } = useRadioButtons(props);

  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const parent = layoutLookups.componentToParent[baseComponentId];
  const parentConfig = parent?.type === 'node' ? layoutLookups.getComponent(parent.id) : undefined;
  const leftColumnHeader = useEvalExpression(
    parentConfig?.type === 'Likert' ? parentConfig.textResourceBindings?.leftColumnHeader : undefined,
    Expressions.Likert.textResourceBindings.leftColumnHeader,
  );

  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  if (fetchingOptions) {
    return (
      <div>
        <AltinnSpinner />
      </div>
    );
  }

  return (
    <RadioButtonsLayout
      componentId={componentId}
      options={calculatedOptions.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
        helpText: option.helpText,
      }))}
      value={selectedValues[0]}
      onChange={handleChangeRadioGroup}
      readOnly={readOnly}
      required={required}
      isValid={isValid}
      alertOnChange={alertOnChange}
      layout={config.layout}
      showAsCard={'showAsCard' in config ? config.showAsCard : false}
      title={title}
      titlePrefix={leftColumnHeader || undefined}
      help={help}
      description={description}
      showOptionalMarking={showOptionalMarking}
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
