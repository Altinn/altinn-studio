import React from 'react';

import { Fieldset, useRadioGroup } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { RadioButton } from 'src/components/form/RadioButton';
import { LabelContent } from 'src/components/label/LabelContent';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/RadioButtons/ControlledRadioGroup.module.css';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import utilClasses from 'src/styles/utils.module.css';
import { shouldUseRowLayout } from 'src/utils/layout';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const ControlledRadioGroup = (props: PropsFromGenericComponent<'RadioButtons' | 'LikertItem'>) => {
  const { baseComponentId, overrideDisplay } = props;
  const isValid = useIsValid(baseComponentId);
  const item = useItemWhenType<'RadioButtons' | 'LikertItem'>(
    baseComponentId,
    (t) => t === 'RadioButtons' || t === 'LikertItem',
  );
  const { id, layout, readOnly, textResourceBindings, required, showLabelsInTable } = item;
  const showAsCard = 'showAsCard' in item ? item.showAsCard : false;
  const { selectedValues, handleChange, fetchingOptions, calculatedOptions } = useRadioButtons(props);
  const alertOnChange = 'alertOnChange' in item ? item.alertOnChange && !!selectedValues[0] : undefined;
  const labelSettings = 'labelSettings' in item ? item.labelSettings : undefined;
  const { lang, langAsString } = useLanguage();
  const selectedLabel = calculatedOptions.find((option) => option.value === selectedValues[0])?.label;
  const selectedLabelTranslated = langAsString(selectedLabel);
  const alertText = selectedLabel
    ? lang('form_filler.radiobutton_alert_label', [`<strong>${selectedLabelTranslated}</strong>`])
    : null;
  const confirmChangeText = langAsString('form_filler.alert_confirm');

  const { getRadioProps } = useRadioGroup({
    name: id,
    value: selectedValues[0],
    onChange: () => handleChange,
    error: !isValid,
  });

  const layoutLookups = useLayoutLookups();
  const parent = layoutLookups.componentToParent[baseComponentId];
  let leftColumnHeader: string | undefined = undefined;
  if (parent?.type === 'node' && layoutLookups.getComponent(parent.id).type === 'Likert') {
    // The parent node type never changes, so this doesn't break the rule of hooks
    // eslint-disable-next-line react-hooks/rules-of-hooks
    leftColumnHeader = useItemWhenType(parent.id, 'Likert').textResourceBindings?.leftColumnHeader;
  }

  const labelText = (
    <LabelContent
      id={id}
      label={
        <>
          {leftColumnHeader ? (
            <>
              <Lang id={leftColumnHeader} />{' '}
            </>
          ) : null}
          <Lang id={textResourceBindings?.title} />
        </>
      }
      help={textResourceBindings?.help}
      required={required}
      readOnly={readOnly}
      labelSettings={labelSettings}
    />
  );

  const hideLabel = overrideDisplay?.renderedInTable === true && calculatedOptions.length === 1 && !showLabelsInTable;
  const shouldDisplayHorizontally = shouldUseRowLayout({
    layout,
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
      <div id={id}>
        <Fieldset role='radiogroup'>
          <Fieldset.Legend
            className={cn(classes.legend, { [utilClasses.visuallyHidden]: overrideDisplay?.renderLegend === false })}
          >
            {labelText}
          </Fieldset.Legend>
          {textResourceBindings?.description && (
            <Fieldset.Description>
              <Lang id={textResourceBindings?.description} />
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
                  name={id}
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
