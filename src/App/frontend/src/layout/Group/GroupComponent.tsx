import React from 'react';
import type { JSX } from 'react';

import { GroupLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import type { HeadingLevel } from '@app/layout-contract/generated/common.generated';

import { AppLanguageTranslatorProvider } from 'src/AppLanguageTranslatorProvider';
import { FormStore } from 'src/features/form/FormContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { getLayoutDepth } from 'src/utils/layout/hierarchy';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';

export interface IGroupComponent {
  baseComponentId: string;
  containerDivRef?: React.Ref<HTMLDivElement>;
  id?: string;
  isSummary?: boolean;
  renderLayoutComponent: (baseComponentId: string) => JSX.Element | null;
}

export function GroupComponent({
  baseComponentId,
  containerDivRef,
  id,
  isSummary,
  renderLayoutComponent,
}: IGroupComponent) {
  const config = useComponentConfig(baseComponentId, 'Group');
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Group.textResourceBindings.title);
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.Group.textResourceBindings.summaryTitle,
  );
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.Group.textResourceBindings.description,
  );
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.Group.textResourceBindings.help);

  const isHidden = useIsHidden(baseComponentId);

  const indexedId = useIndexedId(baseComponentId);
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const depth = getLayoutDepth(baseComponentId, layoutLookups);

  if (isHidden) {
    return null;
  }

  const parent = layoutLookups.componentToParent[baseComponentId];
  const headingLevel = config.headingLevel ?? (Math.min(Math.max(depth + 1, 2), 6) as HeadingLevel);

  // Translated here, so that text in a group inside a repeating group row resolves for that row, also in a summary.
  return (
    <AppLanguageTranslatorProvider>
      <GroupLayout
        componentId={indexedId}
        baseComponentId={baseComponentId}
        containerId={id}
        containerRef={containerDivRef}
        title={isSummary ? (summaryTitle ?? title) : title}
        description={description}
        help={help}
        headingLevel={headingLevel}
        groupingIndicator={config.groupingIndicator}
        isNested={parent?.type === 'node'}
        isSummary={isSummary}
      >
        {config.children.map((id) => renderLayoutComponent(id))}
      </GroupLayout>
    </AppLanguageTranslatorProvider>
  );
}
