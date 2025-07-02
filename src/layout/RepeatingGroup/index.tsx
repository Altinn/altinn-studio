import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent, ValidateComponent, ValidationFilter, ValidationFilterFunction } from '..';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { FrontendValidationSource } from 'src/features/validation';
import { RepeatingGroupDef } from 'src/layout/RepeatingGroup/config.def.generated';
import { RepeatingGroupContainer } from 'src/layout/RepeatingGroup/Container/RepeatingGroupContainer';
import { RepeatingGroupProvider } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { RepeatingGroupsFocusProvider } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupFocusContext';
import { SummaryRepeatingGroup } from 'src/layout/RepeatingGroup/Summary/SummaryRepeatingGroup';
import { RepeatingGroupSummary } from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupSummary';
import { useValidateRepGroupMinCount } from 'src/layout/RepeatingGroup/useValidateRepGroupMinCount';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { validateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { BaseValidation, ComponentValidation } from 'src/features/validation';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { RepGroupInternal } from 'src/layout/RepeatingGroup/types';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { NodeData } from 'src/utils/layout/types';

export class RepeatingGroup extends RepeatingGroupDef implements ValidateComponent, ValidationFilter {
  render = forwardRef<HTMLDivElement, PropsFromGenericComponent<'RepeatingGroup'>>(
    function LayoutComponentRepeatingGroupRender(props, ref): JSX.Element | null {
      return (
        <RepeatingGroupProvider baseComponentId={props.node.baseId}>
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

  renderSummary(props: SummaryRendererProps<'RepeatingGroup'>): JSX.Element | null {
    return <SummaryRepeatingGroup {...props} />;
  }

  renderSummary2(props: Summary2Props<'RepeatingGroup'>): JSX.Element | null {
    return (
      <RepeatingGroupProvider baseComponentId={props.target.baseId}>
        <EmptyChildrenBoundary>
          <RepeatingGroupSummary {...props} />
        </EmptyChildrenBoundary>
      </RepeatingGroupProvider>
    );
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  useComponentValidation(baseComponentId: string): ComponentValidation[] {
    return useValidateRepGroupMinCount(baseComponentId);
  }

  /**
   * Repeating group has its own minCount property, so if set, we should filter out the minItems validation from schema.
   */
  private schemaMinItemsFilter(validation: BaseValidation): boolean {
    return !(
      validation.source === FrontendValidationSource.Schema && validation.message.key === 'validation_errors.minItems'
    );
  }

  getValidationFilters(baseComponentId: string, layoutLookups: LayoutLookups): ValidationFilterFunction[] {
    const component = layoutLookups.getComponent(baseComponentId, 'RepeatingGroup');
    if (component.minCount && component.minCount > 0) {
      return [this.schemaMinItemsFilter];
    }
    return [];
  }

  isDataModelBindingsRequired(): boolean {
    return true;
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'RepeatingGroup'>): string[] {
    const lookupBinding = DataModels.useLookupBinding();
    const layoutLookups = useLayoutLookups();
    const [errors, result] = validateDataModelBindingsAny(
      baseComponentId,
      bindings,
      lookupBinding,
      layoutLookups,
      'group',
      ['array'],
    );
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

  isChildHidden(state: NodeData<'RepeatingGroup'>, childId: string, lookups: LayoutLookups): boolean {
    const hiddenByPlugins = super.isChildHidden(state, childId, lookups);
    if (hiddenByPlugins) {
      return true;
    }

    const { baseComponentId } = splitDashedKey(childId);
    const layout = lookups.getComponent(state.baseId, 'RepeatingGroup');
    const tableColSetup = layout.tableColumns?.[baseComponentId];
    const mode = layout.edit?.mode;

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
