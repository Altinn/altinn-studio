import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { MapDef } from 'src/layout/Map/config.def.generated';
import { useValidateGeometriesBindings } from 'src/layout/Map/features/geometries/useValidateGeometriesBindings';
import { MapComponent } from 'src/layout/Map/MapComponent';
import { MapComponentSummary } from 'src/layout/Map/MapComponentSummary';
import { MapSummary } from 'src/layout/Map/Summary2/MapSummary';
import { parseLocation } from 'src/layout/Map/utils';
import { validateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
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

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'Map'>): string[] {
    const errors: string[] = [];
    const lookupBinding = DataModels.useLookupBinding();
    const layoutLookups = useLayoutLookups();
    const toolbar = useExternalItem(baseComponentId, 'Map').toolbar;

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

    const geometriesBindingErrors = useValidateGeometriesBindings(baseComponentId, bindings);
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
    };
  }
}
