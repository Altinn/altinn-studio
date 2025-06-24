import React from 'react';

import { Fieldset, useRadioGroup } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { RadioButton } from 'src/components/form/RadioButton';
import { LabelContent } from 'src/components/label/LabelContent';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/RadioButtons/ControlledRadioGroup.module.css';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import utilClasses from 'src/styles/utils.module.css';
import { shouldUseRowLayout } from 'src/utils/layout';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type IControlledRadioGroupProps = PropsFromGenericComponent<'RadioButtons' | 'LikertItem'>;

export const ControlledRadioGroup = (props: IControlledRadioGroupProps) => {
  const { node, overrideDisplay } = props;
  const isValid = useIsValid(node);
  const item = useNodeItem(node);
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

  let leftColumnHeader: string | undefined = undefined;
  if (node.parent instanceof LayoutNode && node.parent.isType('Likert')) {
    // The parent node type never changes, so this doesn't break the rule of hooks
    // eslint-disable-next-line react-hooks/rules-of-hooks
    leftColumnHeader = useNodeItem(node.parent, (i) => i.textResourceBindings?.leftColumnHeader);
  }

  const labelText = (
    <LabelContent
      componentId={id}
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
    <ComponentStructureWrapper node={node}>
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
