import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { MapDef } from 'src/layout/Map/config.def.generated';
import { MapComponent } from 'src/layout/Map/MapComponent';
import { MapComponentSummary } from 'src/layout/Map/MapComponentSummary';
import { MapSummary } from 'src/layout/Map/Summary2/MapSummary';
import { parseLocation } from 'src/layout/Map/utils';
import { useValidateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Map extends MapDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Map'>>(
    function LayoutComponentMapRender(props, _): JSX.Element | null {
      return <MapComponent {...props} />;
    },
  );

  useDisplayData(nodeId: string): string {
    const formData = useNodeFormDataWhenType(nodeId, 'Map');
    const location = parseLocation(formData?.simpleBinding);
    return location ? `${location.latitude}, ${location.longitude}` : '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Map'>): JSX.Element | null {
    return <MapComponentSummary targetNode={targetNode} />;
  }

  renderSummary2(props: Summary2Props<'Map'>): JSX.Element | null {
    return <MapSummary {...props} />;
  }

  useDataModelBindingValidation(node: LayoutNode<'Map'>, bindings: IDataModelBindings<'Map'>): string[] {
    const errors: string[] = [];

    const [simpleBindingErrors] = useValidateDataModelBindingsAny(node, bindings, 'simpleBinding', ['string'], false);
    simpleBindingErrors && errors.push(...simpleBindingErrors);

    const [geometriesErrors, geometriesResult] = useValidateDataModelBindingsAny(
      node,
      bindings,
      'geometries',
      ['array'],
      false,
    );
    geometriesErrors && errors.push(...geometriesErrors);

    if (
      geometriesResult &&
      (!geometriesResult.items ||
        typeof geometriesResult.items !== 'object' ||
        Array.isArray(geometriesResult.items) ||
        geometriesResult.items?.type !== 'object' ||
        typeof geometriesResult.items.properties?.data !== 'object' ||
        geometriesResult.items.properties?.data?.type !== 'string' ||
        typeof geometriesResult.items.properties?.label !== 'object' ||
        geometriesResult.items.properties?.label?.type !== 'string')
    ) {
      errors.push(`geometry-datamodellbindingen peker mot en ukjent type i datamodellen`);
    }

    return errors;
  }
}
