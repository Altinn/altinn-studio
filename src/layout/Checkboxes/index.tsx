import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import dot from 'dot-object';

import { useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
import { useValidateSimpleBindingWithOptionalGroup } from 'src/features/saveToGroup/layoutValidation';
import { ObjectToGroupLayoutValidator } from 'src/features/saveToGroup/ObjectToGroupLayoutValidator';
import { useValidateGroupIsEmpty } from 'src/features/saveToGroup/useValidateGroupIsEmpty';
import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { CheckboxesSummary } from 'src/layout/Checkboxes/CheckboxesSummary';
import { CheckboxesDef } from 'src/layout/Checkboxes/config.def.generated';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings, NodeValidationProps } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type Row = Record<string, string | number | boolean>;

export class Checkboxes extends CheckboxesDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Checkboxes'>>(
    function LayoutComponentCheckboxesRender(props, _): JSX.Element | null {
      return <CheckboxContainerComponent {...props} />;
    },
  );

  useDisplayData(nodeId: string): string {
    const node = useNode(nodeId) as LayoutNode<'Checkboxes'> | undefined;
    const formData = useNodeFormDataWhenType(nodeId, 'Checkboxes');
    const options = useNodeOptions(nodeId).options;
    const langAsString = useLanguage().langAsString;

    const dataModelBindings = NodesInternal.useNodeData(node, (data) => data.layout.dataModelBindings);

    const relativeCheckedPath =
      dataModelBindings?.checked && dataModelBindings?.group
        ? dataModelBindings.checked.field.replace(`${dataModelBindings.group.field}.`, '')
        : undefined;

    const relativeSimpleBindingPath =
      dataModelBindings?.simpleBinding && dataModelBindings?.group
        ? dataModelBindings.simpleBinding.field.replace(`${dataModelBindings.group.field}.`, '')
        : undefined;

    const displayRows = (formData?.group as unknown as Row[])
      ?.filter((row) => (!relativeCheckedPath ? true : dot.pick(relativeCheckedPath, row) === true))
      .map((row) => (!relativeSimpleBindingPath ? true : dot.pick(relativeSimpleBindingPath, row)));

    const data = dataModelBindings?.group
      ? getCommaSeparatedOptionsToText(displayRows?.join(','), options, langAsString)
      : getCommaSeparatedOptionsToText(formData?.simpleBinding, options, langAsString);

    return Object.values(data).join(', ');
  }

  evalExpressions(props: ExprResolver<'Checkboxes'>) {
    return {
      ...this.evalDefaultExpressions(props),
      alertOnChange: props.evalBool(props.item.alertOnChange, false),
    };
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Checkboxes'>): JSX.Element | null {
    return <MultipleChoiceSummary targetNode={targetNode} />;
  }

  renderSummary2(props: Summary2Props<'Checkboxes'>): JSX.Element | null {
    return <CheckboxesSummary {...props} />;
  }

  useEmptyFieldValidation(node: LayoutNode<'Checkboxes'>): ComponentValidation[] {
    return useValidateGroupIsEmpty(node);
  }

  renderLayoutValidators(props: NodeValidationProps<'Checkboxes'>): JSX.Element | null {
    return <ObjectToGroupLayoutValidator {...props} />;
  }

  useDataModelBindingValidation(node: LayoutNode<'Checkboxes'>, bindings: IDataModelBindings<'Checkboxes'>): string[] {
    return useValidateSimpleBindingWithOptionalGroup(node, bindings);
  }
}
