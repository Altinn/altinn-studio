import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent, ValidateComponent, ValidationFilter, ValidationFilterFunction } from '..';

import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { RepeatingGroupDef } from 'src/layout/RepeatingGroup/config.def.generated';
import { RepeatingGroupContainer } from 'src/layout/RepeatingGroup/RepeatingGroupContainer';
import { RepeatingGroupProvider } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { RepeatingGroupsFocusProvider } from 'src/layout/RepeatingGroup/RepeatingGroupFocusContext';
import { SummaryRepeatingGroup } from 'src/layout/RepeatingGroup/Summary/SummaryRepeatingGroup';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { BaseValidation, ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { GroupExpressions, RepGroupInternal, RepGroupRowExtras } from 'src/layout/RepeatingGroup/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';
import type { NodeData } from 'src/utils/layout/types';

export class RepeatingGroup extends RepeatingGroupDef implements ValidateComponent<'RepeatingGroup'>, ValidationFilter {
  render = forwardRef<HTMLDivElement, PropsFromGenericComponent<'RepeatingGroup'>>(
    function LayoutComponentRepeatingGroupRender(props, ref): JSX.Element | null {
      return (
        <RepeatingGroupProvider node={props.node}>
          <RepeatingGroupsFocusProvider>
            <RepeatingGroupContainer ref={ref} />
          </RepeatingGroupsFocusProvider>
        </RepeatingGroupProvider>
      );
    },
  );

  evalExpressions(props: ExprResolver<'RepeatingGroup'>): RepGroupInternal {
    const { item, evalBool } = props;

    return {
      ...this.evalDefaultExpressions(props),
      edit: item.edit
        ? {
            ...item.edit,
            addButton: evalBool(item.edit.addButton, true),
          }
        : undefined,
    } as RepGroupInternal;
  }

  evalExpressionsForRow(props: ExprResolver<'RepeatingGroup'>) {
    const { evalBool, item, evalTrb } = props;

    const evaluatedTrb = evalTrb();
    const textResourceBindings: GroupExpressions['textResourceBindings'] = {
      edit_button_close: evaluatedTrb?.textResourceBindings?.edit_button_close,
      edit_button_open: evaluatedTrb?.textResourceBindings?.edit_button_open,
      save_and_next_button: evaluatedTrb?.textResourceBindings?.save_and_next_button,
      save_button: evaluatedTrb?.textResourceBindings?.save_button,
    };
    const edit: GroupExpressions['edit'] = {
      alertOnDelete: evalBool(item.edit?.alertOnDelete, false),
      editButton: evalBool(item.edit?.editButton, true),
      deleteButton: evalBool(item.edit?.deleteButton, true),
      saveAndNextButton: evalBool(item.edit?.saveAndNextButton, false),
      saveButton: evalBool(item.edit?.saveButton, true),
    };

    const groupExpressions: GroupExpressions = {
      hiddenRow: evalBool(item.hiddenRow, false),
      textResourceBindings: item.textResourceBindings ? textResourceBindings : undefined,
      edit: item.edit ? edit : undefined,
    };

    return { groupExpressions } as RepGroupRowExtras;
  }

  renderSummary(props: SummaryRendererProps<'RepeatingGroup'>): JSX.Element | null {
    return <SummaryRepeatingGroup {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  getDisplayData(): string {
    return '';
  }

  runComponentValidation(
    node: LayoutNode<'RepeatingGroup'>,
    { nodeDataSelector }: ValidationDataSources,
  ): ComponentValidation[] {
    const dataModelBindings = nodeDataSelector((picker) => picker(node)?.layout.dataModelBindings, [node]);
    if (!dataModelBindings) {
      return [];
    }

    const validations: ComponentValidation[] = [];
    // check if minCount is less than visible rows
    const minCount = nodeDataSelector((picker) => picker(node)?.item?.minCount, [node]) ?? 0;
    const visibleRows = nodeDataSelector(
      (picker) => picker(node)?.item?.rows?.filter((row) => row && !row.groupExpressions?.hiddenRow).length,
      [node],
    );

    // Validate minCount
    if (visibleRows !== undefined && visibleRows < minCount) {
      validations.push({
        message: { key: 'validation_errors.minItems', params: [minCount] },
        severity: 'error',
        source: FrontendValidationSource.Component,
        // Treat visibility of minCount the same as required to prevent showing an error immediately
        category: ValidationMask.Required,
      });
    }

    return validations;
  }

  /**
   * Repeating group has its own minCount property, so if set, we should filter out the minItems validation from schema.
   */
  private schemaMinItemsFilter(validation: BaseValidation): boolean {
    return !(
      validation.source === FrontendValidationSource.Schema && validation.message.key === 'validation_errors.minItems'
    );
  }

  getValidationFilters(node: LayoutNode<'RepeatingGroup'>, selector: NodeDataSelector): ValidationFilterFunction[] {
    if (selector((picker) => picker(node)?.item?.minCount ?? 0, [node]) > 0) {
      return [this.schemaMinItemsFilter];
    }
    return [];
  }

  isDataModelBindingsRequired(): boolean {
    return true;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'RepeatingGroup'>): string[] {
    const [errors, result] = this.validateDataModelBindingsAny(ctx, 'group', ['array']);
    if (errors) {
      return errors;
    }

    if (result) {
      const innerType = Array.isArray(result.items) ? result.items[0] : result.items;
      if (!innerType || typeof innerType !== 'object' || !innerType.type || innerType.type !== 'object') {
        return [`group-datamodellbindingen peker mot en ukjent type i datamodellen`];
      }
    }

    return [];
  }

  isChildHidden(state: NodeData<'RepeatingGroup'>, childNode: LayoutNode): boolean {
    const hiddenByPlugins = super.isChildHidden(state, childNode);
    if (hiddenByPlugins) {
      return true;
    }

    const row = childNode.rowIndex !== undefined ? state.item?.rows[childNode.rowIndex] : undefined;
    const rowHidden = row?.groupExpressions?.hiddenRow;
    if (rowHidden) {
      return true;
    }

    const baseId = childNode.baseId;
    const tableColSetup = state.item?.tableColumns?.[baseId];
    const mode = state.item?.edit?.mode;

    // This specific configuration hides the component fully, without having set hidden=true on the component itself.
    // It's most likely done by mistake, but we still need to respect it when checking if the component is hidden,
    // because it doesn't make sense to validate a component that is hidden in the UI and the
    // user cannot interact with.
    let hiddenImplicitly =
      tableColSetup?.showInExpandedEdit === false &&
      !tableColSetup?.editInTable &&
      mode !== 'onlyTable' &&
      mode !== 'showAll';

    if (mode === 'onlyTable' && tableColSetup?.editInTable === false) {
      // This is also a way to hide a component implicitly
      hiddenImplicitly = true;
    }

    // TODO: Comment this in. It will be a breaking change, and may break some
    // apps (for example the PDF view in ssb/ra0760-01) which rely on this.
    // Usually, implementing the following issue will solve the cases where this is misused:
    // https://github.com/Altinn/app-frontend-react/issues/1494

    // if (row?.groupExpressions?.edit?.editButton === false && mode !== 'showAll' && mode !== 'onlyTable') {
    //   // If the edit button is hidden for this row, it is not possible to open the editContainer. The component
    //   // will effectively be hidden unless it is editable in the table.
    //   return !tableColSetup?.editInTable;
    // }

    return hiddenImplicitly;
  }
}
