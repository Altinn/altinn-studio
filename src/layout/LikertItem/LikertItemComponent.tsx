import React, { forwardRef } from 'react';

import { Radio, Table } from '@digdir/designsystemet-react';

import { Label } from 'src/components/label/Label';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { LayoutStyle } from 'src/layout/common.generated';
import classes from 'src/layout/LikertItem/LikertItemComponent.module.css';
import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IControlledRadioGroupProps } from 'src/layout/RadioButtons/ControlledRadioGroup';

export const LikertItemComponent = forwardRef<HTMLTableRowElement, PropsFromGenericComponent<'LikertItem'>>(
  (props, ref) => {
    const nodeLayout = props.node.item.layout;
    const overriddenLayout = props.overrideItemProps?.layout;
    const layout = overriddenLayout ?? nodeLayout;

    if (layout === LayoutStyle.Table) {
      return (
        <RadioGroupTableRow
          {...props}
          ref={ref}
        />
      );
    }

    return <ControlledRadioGroup {...props} />;
  },
);
LikertItemComponent.displayName = 'LikertItemComponent';

const RadioGroupTableRow = forwardRef<HTMLTableRowElement, IControlledRadioGroupProps>((props, ref) => {
  const { node } = props;
  const { langAsString } = useLanguage();
  const { selectedValues, handleChange, calculatedOptions, fetchingOptions } = useRadioButtons(props);
  const validations = useUnifiedValidationsForNode(node);

  const { id, readOnly } = node.item;
  const groupContainerId = node.closest((n) => n.type === 'Likert')?.item.id;

  const headerColumnId = `${groupContainerId}-likert-columnheader-left`;
  const rowLabelId = `row-label-${id}`;

  return (
    <Table.Row
      aria-labelledby={`${headerColumnId} ${rowLabelId}`}
      data-componentid={node.item.id}
      data-is-loading={fetchingOptions ? 'true' : 'false'}
      role='radiogroup'
      ref={ref}
    >
      <Table.Cell id={rowLabelId}>
        <Label
          {...node.item}
          renderLabelAs='legend'
        >
          <ComponentValidations
            validations={validations}
            node={node}
          />
        </Label>
      </Table.Cell>
      {calculatedOptions?.map((option) => {
        const isChecked = selectedValues[0] === option.value;
        return (
          <Table.Cell key={option.value}>
            <Radio
              checked={isChecked}
              readOnly={readOnly}
              onChange={handleChange}
              value={option.value}
              className={classes.likertRadioButton}
              name={rowLabelId}
              aria-label={langAsString(option.label)}
            />
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
});

RadioGroupTableRow.displayName = 'RadioGroupTableRow';
