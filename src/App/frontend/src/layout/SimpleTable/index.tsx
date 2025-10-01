import React, { forwardRef } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { ApiTable } from 'src/layout/SimpleTable/ApiTable';
import { ApiTableSummary } from 'src/layout/SimpleTable/ApiTableSummary';
import { SimpleTableDef } from 'src/layout/SimpleTable/config.def.generated';
import { SimpleTableComponent } from 'src/layout/SimpleTable/SimpleTableComponent';
import { SimpleTableFeatureFlagLayoutValidator } from 'src/layout/SimpleTable/SimpleTableFeatureFlagLayoutValidator';
import { SimpleTableSummary } from 'src/layout/SimpleTable/SimpleTableSummary';
import { validateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings, NodeValidationProps } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class SimpleTable extends SimpleTableDef {
  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'SimpleTable'>): string[] {
    const layoutLookups = useLayoutLookups();
    const component = layoutLookups.getComponent(baseComponentId, 'SimpleTable');
    const lookupBinding = DataModels.useLookupBinding();
    const [errors, result] = validateDataModelBindingsAny(
      baseComponentId,
      bindings,
      lookupBinding,
      layoutLookups,
      'tableData',
      ['array'],
    );
    if (errors) {
      return errors;
    }

    if (Array.isArray(result.items) && result?.items.length > 0) {
      const innerType = result?.items[0];
      if (typeof innerType !== 'object' || !innerType.type || innerType.type !== 'object') {
        return [
          `group-datamodellbindingen må peke på en liste av objekter. Bruk andre komponenter for å vise lister av strings eller tall.`,
        ];
      }
    }

    if (component.dataModelBindings && component.externalApi) {
      return [`Du har spesifisert både dataModelBindings og externalApi. Vennligst bruk den ene eller den andre`];
    }

    return [];
  }

  isDataModelBindingsRequired() {
    return false;
  }
  renderSummary2(props: Summary2Props): React.JSX.Element | null {
    const { externalApi, dataModelBindings } = useItemWhenType(props.targetBaseComponentId, 'SimpleTable');

    if (externalApi) {
      return <ApiTableSummary {...props} />;
    }

    if (dataModelBindings) {
      return <SimpleTableSummary {...props} />;
    }

    return null;
  }
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'SimpleTable'>>(
    function LayoutComponentTableRender(props, _): React.JSX.Element | null {
      const { dataModelBindings, externalApi } = useItemWhenType(props.baseComponentId, 'SimpleTable');
      if (dataModelBindings) {
        return (
          <SimpleTableComponent
            {...props}
            dataModelBindings={dataModelBindings}
          />
        );
      }

      if (externalApi) {
        return (
          <ApiTable
            {...props}
            externalApi={externalApi}
          />
        );
      }

      return null;
    },
  );

  renderLayoutValidators(props: NodeValidationProps<'SimpleTable'>): React.JSX.Element | null {
    return <SimpleTableFeatureFlagLayoutValidator {...props} />;
  }

  renderSummary(_: SummaryRendererProps): React.JSX.Element | null {
    return null;
  }
}
