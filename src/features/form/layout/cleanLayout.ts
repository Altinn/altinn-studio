import { preProcessLayout } from 'src/features/expressions/validation';
import { ComponentConfigs } from 'src/layout/components.generated';
import type { CompTypes, ILayout } from 'src/layout/layout';

type ComponentTypeCaseMapping = { [key: string]: CompTypes };
let componentTypeCaseMapping: ComponentTypeCaseMapping | undefined = undefined;
function getCaseMapping(): ComponentTypeCaseMapping {
  if (!componentTypeCaseMapping) {
    componentTypeCaseMapping = {};
    for (const type in ComponentConfigs) {
      componentTypeCaseMapping[type.toLowerCase()] = type as CompTypes;
    }
  }

  return componentTypeCaseMapping;
}

export function cleanLayout(layout: ILayout, validateExpressions = true): ILayout {
  const mapping = getCaseMapping();
  const newLayout = layout.map((component) => ({
    ...component,
    type: mapping[component.type.toLowerCase()] || component.type,
  })) as ILayout;

  validateExpressions && preProcessLayout(newLayout);

  return newLayout;
}
