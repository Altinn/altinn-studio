import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import dot from 'dot-object';

import { useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
import { useValidateSimpleBindingWithOptionalGroup } from 'src/features/saveToGroup/layoutValidation';
import { ObjectToGroupLayoutValidator } from 'src/features/saveToGroup/ObjectToGroupLayoutValidator';
import { useValidateGroupIsEmpty } from 'src/features/saveToGroup/useValidateGroupIsEmpty';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { MultipleSelectDef } from 'src/layout/MultipleSelect/config.def.generated';
import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import { MultipleSelectSummary } from 'src/layout/MultipleSelect/MultipleSelectSummary';
import { NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings, NodeValidationProps } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type Row = Record<string, string | number | boolean>;

export class MultipleSelect extends MultipleSelectDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'MultipleSelect'>>(
    function LayoutComponentMultipleSelectRender(props, _): JSX.Element | null {
      return <MultipleSelectComponent {...props} />;
    },
  );

  useDisplayData(nodeId: string): string {
    const node = useNode(nodeId) as LayoutNode<'MultipleSelect'> | undefined;
    const formData = useNodeFormDataWhenType(nodeId, 'MultipleSelect');
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
      ? displayRows
      : getCommaSeparatedOptionsToText(formData?.simpleBinding, options, langAsString);

    return Object.values(data).join(', ');
  }

  evalExpressions(props: ExprResolver<'MultipleSelect'>) {
    return {
      ...this.evalDefaultExpressions(props),
      alertOnChange: props.evalBool(props.item.alertOnChange, false),
    };
  }

  renderSummary({ targetNode }: SummaryRendererProps<'MultipleSelect'>): JSX.Element | null {
    return <MultipleChoiceSummary targetNode={targetNode} />;
  }

  renderSummary2(props: Summary2Props<'MultipleSelect'>): JSX.Element | null {
    return <MultipleSelectSummary {...props} />;
  }

  useEmptyFieldValidation(node: LayoutNode<'MultipleSelect'>): ComponentValidation[] {
    return useValidateGroupIsEmpty(node);
  }

  renderLayoutValidators(props: NodeValidationProps<'MultipleSelect'>): JSX.Element | null {
    return <ObjectToGroupLayoutValidator {...props} />;
  }

  useDataModelBindingValidation(
    node: LayoutNode<'MultipleSelect'>,
    bindings: IDataModelBindings<'MultipleSelect'>,
  ): string[] {
    return useValidateSimpleBindingWithOptionalGroup(node, bindings);
  }
}
