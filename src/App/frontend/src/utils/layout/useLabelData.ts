import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemFor } from 'src/utils/layout/useNodeItem';
import type { GenericComponentOverrideDisplay } from 'src/layout/FormComponentContext';

export interface LabelData {
  componentId: string;
  title: string | undefined;
  help: string | undefined;
  description: string | undefined;
  required: boolean | undefined;
  readOnly: boolean | undefined;
  showOptionalMarking: boolean;
}

/**
 * Returns the primitive data (text-resource keys + booleans) needed to render a label
 */
export function useLabelData({
  baseComponentId,
  overrideDisplay,
}: {
  baseComponentId: string;
  overrideDisplay: GenericComponentOverrideDisplay | undefined;
}): LabelData {
  const item = useItemFor(baseComponentId);
  const componentId = useIndexedId(baseComponentId);

  const readOnly = 'readOnly' in item ? item.readOnly : undefined;
  const required = 'required' in item ? item.required : undefined;
  const showOptionalMarking = 'labelSettings' in item && !!item.labelSettings?.optionalIndicator;

  const trb = item.textResourceBindings;
  const { title, help, description } = trb
    ? {
        title: 'title' in trb ? trb.title : undefined,
        help: 'help' in trb ? trb.help : undefined,
        description: 'description' in trb ? trb.description : undefined,
      }
    : { title: undefined, help: undefined, description: undefined };

  const shouldShowLabel =
    (overrideDisplay?.renderLabel ?? true) && overrideDisplay?.renderedInTable !== true && !!title;

  return {
    componentId,
    title: shouldShowLabel ? title : undefined,
    help,
    description,
    required,
    readOnly,
    showOptionalMarking,
  };
}
