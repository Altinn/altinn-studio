import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemFor } from 'src/utils/layout/useNodeItem';
import type { GenericComponentOverrideDisplay } from 'src/layout/FormComponentContext';

/**
 * Returns the primitive data (text-resource keys + booleans) needed to render a label, ready to be
 * spread into the `LabelComponent` from `@app/form-component`. Replaces {@link useLabel}, which
 * returned ready-made JSX. The `LabelComponent` is responsible for translating the keys and building
 * the help text, description and indicators.
 */
export function useLabelData({
  baseComponentId,
  overrideDisplay,
}: {
  baseComponentId: string;
  overrideDisplay: GenericComponentOverrideDisplay | undefined;
}) {
  const item = useItemFor(baseComponentId);
  const componentId = useIndexedId(baseComponentId);

  const readOnly = item['readOnly'];
  const required = item['required'];
  const showOptionalMarking = !!item['labelSettings']?.['optionalIndicator'];
  const title = item.textResourceBindings?.['title'];
  const help = item.textResourceBindings?.['help'];
  const description = item.textResourceBindings?.['description'];

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
