import { getComponentConfigs } from 'src/layout/components.generated';
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

export function cleanLayout(layout: ILayout): ILayout {
  const mapping = getCaseMapping();
  return layout.map((component) => ({
    ...component,
    type: mapping[component.type.toLowerCase()] || component.type,
  })) as ILayout;
}
