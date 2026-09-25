import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';

import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalTrb } from 'src/utils/layout/useEvalExpression';
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
  const config = useComponentConfig(baseComponentId);
  const readOnly = useEvalExpression(
    'readOnly' in config ? config.readOnly : undefined,
    CommonExpressions.FormComponentProps.readOnly,
  );
  const required = useEvalExpression(
    'required' in config ? config.required : undefined,
    CommonExpressions.FormComponentProps.required,
  );
  const title = useEvalOptionalTrb(config, 'title', CommonExpressions.TRBLabel);
  const help = useEvalOptionalTrb(config, 'help', CommonExpressions.TRBLabel);
  const description = useEvalOptionalTrb(config, 'description', CommonExpressions.TRBLabel);

  const componentId = useIndexedId(baseComponentId);
  const showOptionalMarking = 'labelSettings' in config && !!config.labelSettings?.optionalIndicator;

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
