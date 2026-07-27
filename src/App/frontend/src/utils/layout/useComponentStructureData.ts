import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import { getComponentDef } from 'src/layout/index';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { IGridStyling } from 'src/layout/common.generated';

export interface ComponentStructureData {
  componentId: string;
  innerGrid: IGridStyling | undefined;
  validationGrid: IGridStyling | undefined;
  showValidationMessages: boolean;
}

/**
 * Returns the data needed to render the structural wrapper around a layout component
 * (grid sizing + whether default validation messages should be shown).
 */
export function useComponentStructureData(baseComponentId: string): ComponentStructureData {
  const overrideItemProps = useFormComponentCtx()?.overrideItemProps;
  const component = useExternalItem(baseComponentId);
  const grid = overrideItemProps?.grid ?? component?.grid;
  const layoutComponent = getComponentDef(component.type);
  const showValidationMessages = layoutComponent.renderDefaultValidations();
  const componentId = useIndexedId(baseComponentId);

  return {
    componentId,
    innerGrid: grid?.innerGrid,
    validationGrid: grid?.validationGrid,
    showValidationMessages,
  };
}
