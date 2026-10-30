import React, { useId } from 'react';

import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalTrb } from 'src/utils/layout/useEvalExpression';

export function useSummaryLabelText(baseComponentId: string) {
  const config = useComponentConfig(baseComponentId);
  const description = useEvalOptionalTrb(config, 'description', CommonExpressions.TRBLabel);
  const help = useEvalOptionalTrb(config, 'help', CommonExpressions.TRBLabel);
  return { description, help };
}

export function useSummaryLabelProps(baseComponentId: string) {
  const labelText = useSummaryLabelText(baseComponentId);
  const id = useId();
  return { ...labelText, id, summary: true as const };
}

export function useSummaryCaptionProps(baseComponentId: string, title: string | undefined) {
  const { description, help } = useSummaryLabelText(baseComponentId);
  const id = useId();
  const { langAsString } = useLanguage();

  return {
    id,
    description: description ? <Lang id={description} /> : undefined,
    helpText: help ? { text: <Lang id={help} />, accessibleTitle: langAsString(title) } : undefined,
  };
}
