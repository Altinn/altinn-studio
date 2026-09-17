import React from 'react';

import { ConditionalWrapper } from '@app/form-component';
import { CommonExpressions, Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Fieldset, useRadioGroup } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { RadioButton } from 'src/components/form/RadioButton';
import { LabelContent } from 'src/components/label/LabelContent';
import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/RadioButtons/ControlledRadioGroup.module.css';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import utilClasses from 'src/styles/utils.module.css';
import { shouldUseRowLayout } from 'src/utils/layout';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const ControlledRadioGroup = (props: PropsFromGenericComponent<'RadioButtons' | 'LikertItem'>) => {
  const { baseComponentId, overrideDisplay } = props;
  const isValid = useIsValid(baseComponentId);
  const config = useComponentConfig<'RadioButtons' | 'LikertItem'>(
    baseComponentId,
    (t) => t === 'RadioButtons' || t === 'LikertItem',
  );
  const componentId = useIndexedId(baseComponentId);
  const readOnly = useEvalExpression(
    'readOnly' in config ? config.readOnly : undefined,
    CommonExpressions.FormComponentProps.readOnly,
  );
  const required = useEvalExpression(
    'required' in config ? config.required : undefined,
    CommonExpressions.FormComponentProps.required,
  );
  const title = useEvalOptionalText(
    config.textResourceBindings && 'title' in config.textResourceBindings
      ? config.textResourceBindings.title
      : undefined,
    CommonExpressions.TRBLabel.title,
  );
  const help = useEvalOptionalText(
    config.textResourceBindings && 'help' in config.textResourceBindings ? config.textResourceBindings.help : undefined,
    CommonExpressions.TRBLabel.help,
  );
  const description = useEvalOptionalText(
    config.textResourceBindings && 'description' in config.textResourceBindings
      ? config.textResourceBindings.description
      : undefined,
    CommonExpressions.TRBLabel.description,
  );

  const showAsCard = 'showAsCard' in config ? config.showAsCard : false;
  const { selectedValues, handleChange, fetchingOptions, calculatedOptions } = useRadioButtons(props);
  const alertOnChange =
    useEvalExpression(
      'alertOnChange' in config ? config.alertOnChange : undefined,
      Expressions.RadioButtons.alertOnChange,
    ) && !!selectedValues[0];
  const labelSettings = 'labelSettings' in config ? config.labelSettings : undefined;
  const { lang, langAsString } = useLanguage();
  const selectedLabel = calculatedOptions.find((option) => option.value === selectedValues[0])?.label;
  const selectedLabelTranslated = langAsString(selectedLabel);
  const alertText = selectedLabel
    ? lang('form_filler.radiobutton_alert_label', [`<strong>${selectedLabelTranslated}</strong>`])
    : null;
  const confirmChangeText = langAsString('form_filler.alert_confirm');
  const { getRadioProps } = useRadioGroup({
    name: componentId,
    value: selectedValues[0],
    onChange: () => handleChange,
    error: !isValid,
  });
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const parent = layoutLookups.componentToParent[baseComponentId];
  const parentConfig = parent?.type === 'node' ? layoutLookups.getComponent(parent.id) : undefined;
  const leftColumnHeader = useEvalExpression(
    parentConfig?.type === 'Likert' ? parentConfig.textResourceBindings?.leftColumnHeader : undefined,
    Expressions.Likert.textResourceBindings.leftColumnHeader,
  );
  const labelText = (
    <LabelContent
      id={componentId}
      label={
        <>
          {leftColumnHeader ? (
            <>
              <Lang id={leftColumnHeader} />{' '}
            </>
          ) : null}
          <Lang id={title} />
        </>
      }
      help={help}
      required={required}
      readOnly={readOnly}
      labelSettings={labelSettings}
    />
  );
  const hideLabel =
    overrideDisplay?.renderedInTable === true && calculatedOptions.length === 1 && !config.showLabelsInTable;
  const renderLegend = overrideDisplay?.renderLegend !== false;
  const fieldsetAriaLabel = !renderLegend ? langAsString(title) : undefined;
  const shouldDisplayHorizontally = shouldUseRowLayout({
    layout: config.layout,
    optionsCount: calculatedOptions.length,
  });
  if (fetchingOptions) {
    return (
      <div>
        <AltinnSpinner />
      </div>
    );
  }
  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <div id={componentId}>
        <Fieldset
          role='radiogroup'
          aria-label={fieldsetAriaLabel}
        >
          {renderLegend && <Fieldset.Legend className={classes.legend}>{labelText}</Fieldset.Legend>}
          {description && (
            <Fieldset.Description
              className={cn({ [utilClasses.visuallyHidden]: overrideDisplay?.renderLegend === false })}
            >
              <Lang id={description} />
            </Fieldset.Description>
          )}
          <ConditionalWrapper
            condition={shouldDisplayHorizontally}
            wrapper={(children) => <div className={classes.inlineRadioGroup}>{children}</div>}
          >
            {calculatedOptions.map((option) => {
              const radioProps = getRadioProps({ value: option.value });
              return (
                <RadioButton
                  key={option.value}
                  label={langAsString(option.label)}
                  description={option.description && <Lang id={option.description} />}
                  helpText={option.helpText && <Lang id={option.helpText} />}
                  value={radioProps.value}
                  name={componentId}
                  checked={option.value === selectedValues[0]}
                  showAsCard={showAsCard}
                  readOnly={readOnly}
                  onChange={handleChange}
                  hideLabel={hideLabel}
                  data-size='sm'
                  aria-invalid={!isValid}
                  alertOnChange={alertOnChange}
                  alertText={alertText}
                  confirmChangeText={confirmChangeText}
                />
              );
            })}
          </ConditionalWrapper>
        </Fieldset>
      </div>
    </ComponentStructureWrapper>
  );
};
