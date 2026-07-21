import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { MapDef } from 'src/layout/Map/config.def.generated';
import { validateGeometriesBindings } from 'src/layout/Map/features/geometries/useValidateGeometriesBindings';
import { MapComponent } from 'src/layout/Map/MapComponent';
import { MapComponentSummary } from 'src/layout/Map/MapComponentSummary';
import { MapSummary } from 'src/layout/Map/Summary2/MapSummary';
import { parseLocation } from 'src/layout/Map/utils';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import { validateDataModelBindingsAny } from 'src/utils/layout/validation/utils';
import type { DataModelBindingValidationContext, PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Map extends MapDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Map'>>(
    function LayoutComponentMapRender(props, _): JSX.Element | null {
      return <MapComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'Map');
    const location = parseLocation(formData?.simpleBinding);
    return location ? `${location.latitude}, ${location.longitude}` : '';
  }

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    return <MapComponentSummary {...props} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <MapSummary {...props} />;
  }

  validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'Map'>,
    context: DataModelBindingValidationContext,
  ): string[] {
    const errors: string[] = [];
    const { lookupBinding, layoutLookups } = context;
    const toolbar = layoutLookups.getComponent(baseComponentId, 'Map').toolbar;

    if (bindings?.simpleBinding && bindings?.geometryIsEditable) {
      errors.push(
        'geometryIsEditable cannot be used with simpleBinding (markers will be added as geometry when geometryIsEditable is set)',
      );
    }

    if (bindings?.geometryIsEditable && toolbar === undefined) {
      errors.push('geometryIsEditable cannot be used without a defined toolbar');
    }

    if (!bindings?.geometryIsEditable && toolbar !== undefined) {
      errors.push('toolbar cannot be used without setting geometryIsEditable in dataModelBindings');
    }

    const [simpleBindingErrors] = validateDataModelBindingsAny(
      baseComponentId,
      bindings,
      lookupBinding,
      layoutLookups,
      'simpleBinding',
      ['string'],
      false,
    );
    simpleBindingErrors && errors.push(...simpleBindingErrors);

    const geometriesBindingErrors = validateGeometriesBindings(baseComponentId, bindings, context);
    errors.push(...geometriesBindingErrors);

    return errors;
  }

  evalExpressions(props: ExprResolver<'Map'>) {
    return {
      ...this.evalDefaultExpressions(props),
      centerLocation: {
        latitude: props.evalNum(props.item.centerLocation?.latitude, 0),
        longitude: props.evalNum(props.item.centerLocation?.longitude, 0),
      },
      ...(props.item.toolbar && {
        toolbar: {
          polyline: props.evalBool(props.item.toolbar.polyline, false),
          polygon: props.evalBool(props.item.toolbar.polygon, false),
          rectangle: props.evalBool(props.item.toolbar.rectangle, false),
          circle: props.evalBool(props.item.toolbar.circle, false),
          marker: props.evalBool(props.item.toolbar.marker, false),
        },
      }),
    };
  }
}
