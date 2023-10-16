import React from 'react';

import { Checkbox, HelpText } from '@digdir/design-system-react';
import cn from 'classnames';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useAlertOnChange } from 'src/hooks/useAlertOnChange';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Checkboxes/CheckboxesContainerComponent.module.css';
import { shouldUseRowLayout } from 'src/utils/layout';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { PropsFromGenericComponent } from 'src/layout';

export type ICheckboxContainerProps = PropsFromGenericComponent<'Checkboxes'>;

const defaultSelectedOptions: string[] = [];

export const CheckboxContainerComponent = ({
  node,
  formData,
  isValid,
  handleDataChange,
  overrideDisplay,
}: ICheckboxContainerProps) => {
  const { id, layout, readOnly, textResourceBindings, required, labelSettings, alertOnChange } = node.item;
  const { lang, langAsString } = useLanguage();
  const {
    value: _value,
    setValue,
    saveValue,
  } = useDelayedSavedState(handleDataChange, formData?.simpleBinding ?? '', 200);

  const value = _value ?? formData?.simpleBinding ?? '';
  const selected = value && value.length > 0 ? value.split(',') : defaultSelectedOptions;
  const { options: calculatedOptions, isFetching } = useGetOptions({
    ...node.item,
    node,
    formData: {
      type: 'multi',
      values: selected,
      setValues: (values) => {
        setValue(values.join(','));
      },
    },
  });

  const onChange = (checkedItems: string[]) => {
    const checkedItemsString = checkedItems.join(',');
    if (checkedItemsString !== value) {
      setValue(checkedItems.join(','));
    }
  };

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange } = useAlertOnChange(
    Boolean(alertOnChange),
    onChange,
    // Only alert when unchecking
    (checkedItems) => checkedItems.length < selected.length,
  );

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    // Only set value instantly if moving focus outside of the checkbox group
    if (!event.currentTarget.contains(event.relatedTarget)) {
      saveValue();
    }
  };

  const labelTextGroup = (
    <span className={classes.checkBoxLabelContainer}>
      {lang(node.item.textResourceBindings?.title)}
      <RequiredIndicator required={required} />
      <OptionalIndicator
        labelSettings={labelSettings}
        required={required}
      />
      {textResourceBindings?.help && (
        <HelpText title={langAsString(textResourceBindings?.help)}>{lang(textResourceBindings?.help)}</HelpText>
      )}
    </span>
  );

  const horizontal = shouldUseRowLayout({
    layout,
    optionsCount: calculatedOptions.length,
  });
  const hideLabel = overrideDisplay?.renderedInTable === true && calculatedOptions.length === 1;
  const ariaLabel = overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined;

  return isFetching ? (
    <AltinnSpinner />
  ) : (
    <div
      id={id}
      key={`checkboxes_group_${id}`}
      onBlur={handleBlur}
    >
      <Checkbox.Group
        className={cn({ [classes.horizontal]: horizontal })}
        legend={labelTextGroup}
        description={lang(textResourceBindings?.description)}
        disabled={readOnly}
        onChange={handleChange}
        hideLegend={overrideDisplay?.renderLegend === false}
        error={!isValid}
        aria-label={ariaLabel}
        value={selected}
      >
        {calculatedOptions.map((option) => (
          <ConditionalWrapper
            key={option.value}
            condition={Boolean(alertOnChange)}
            wrapper={(children) => (
              <DeleteWarningPopover
                deleteButtonText={lang('form_filler.alert_confirm') as string}
                messageText={lang('form_filler.checkbox_alert') as string}
                onCancelClick={cancelChange}
                onPopoverDeleteClick={confirmChange}
                open={alertOpen}
                setOpen={setAlertOpen}
              >
                {children}
              </DeleteWarningPopover>
            )}
          >
            <Checkbox
              id={`${id}-${option.label.replace(/\s/g, '-')}`}
              name={option.value}
              description={lang(option.description)}
              value={option.value}
              checked={selected.includes(option.value)}
              size='small'
            >
              {
                <span className={cn({ 'sr-only': hideLabel }, classes.checkBoxLabelContainer)}>
                  {langAsString(option.label)}
                  {option.helpText && (
                    <HelpText title={getPlainTextFromNode(option.helpText)}>{lang(option.helpText)}</HelpText>
                  )}
                </span>
              }
            </Checkbox>
          </ConditionalWrapper>
        ))}
      </Checkbox.Group>
    </div>
  );
};
