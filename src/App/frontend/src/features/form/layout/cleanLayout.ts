import { getComponentConfigs } from 'src/layout/components.generated';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompTypes, ILayout } from 'src/layout/layout';

type ComponentTypeCaseMapping = { [key: string]: CompTypes };
let componentTypeCaseMapping: ComponentTypeCaseMapping | undefined = undefined;
function getCaseMapping(): ComponentTypeCaseMapping {
  if (!componentTypeCaseMapping) {
    componentTypeCaseMapping = {};
    for (const type in getComponentConfigs()) {
      componentTypeCaseMapping[type.toLowerCase()] = type as CompTypes;
    }
  }

  return componentTypeCaseMapping;
}

export function cleanLayout(layout: ILayout, dataModelType: string): ILayout {
  const mapping = getCaseMapping();
  return layout.map((component) => {
    const out = {
      ...component,
      type: mapping[component.type.toLowerCase()] || component.type,
    };

    if (out.dataModelBindings) {
      const rewrittenBindings: Record<string, IDataModelReference> = {};

      for (const [key, value] of Object.entries(out.dataModelBindings)) {
        if (typeof value === 'string') {
          rewrittenBindings[key] = {
            dataType: dataModelType,
            field: value,
          };
        } else {
          rewrittenBindings[key] = value;
        }
      }

      out.dataModelBindings = rewrittenBindings;
    }

    return out;
  }) as ILayout;
}
