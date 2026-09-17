import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';

import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
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
  const evaluatedTitle = useEvalExpression(
    config.textResourceBindings && 'title' in config.textResourceBindings
      ? config.textResourceBindings.title
      : undefined,
    CommonExpressions.TRBLabel.title,
  );
  const evaluatedHelp = useEvalExpression(
    config.textResourceBindings && 'help' in config.textResourceBindings ? config.textResourceBindings.help : undefined,
    CommonExpressions.TRBLabel.help,
  );
  const evaluatedDescription = useEvalExpression(
    config.textResourceBindings && 'description' in config.textResourceBindings
      ? config.textResourceBindings.description
      : undefined,
    CommonExpressions.TRBLabel.description,
  );

  const componentId = useIndexedId(baseComponentId);
  const title =
    config.textResourceBindings &&
    'title' in config.textResourceBindings &&
    config.textResourceBindings.title !== undefined
      ? evaluatedTitle
      : undefined;
  const help =
    config.textResourceBindings &&
    'help' in config.textResourceBindings &&
    config.textResourceBindings.help !== undefined
      ? evaluatedHelp
      : undefined;
  const description =
    config.textResourceBindings &&
    'description' in config.textResourceBindings &&
    config.textResourceBindings.description !== undefined
      ? evaluatedDescription
      : undefined;
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
