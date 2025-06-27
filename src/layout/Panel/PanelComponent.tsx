import React from 'react';

import { PANEL_VARIANT } from 'src/app-components/Panel/constants';
import { Panel } from 'src/app-components/Panel/Panel';
import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

type IPanelProps = PropsFromGenericComponent<'Panel'>;

export const PanelComponent = ({ node }: IPanelProps) => {
  const { textResourceBindings, variant, showIcon, grid } = useNodeItem(node);
  const fullWidth = !grid && node.parent instanceof LayoutPage;

  const { isOnBottom, isOnTop } = NodesInternal.useShallowSelector((state) => {
    let children: string[] = [];
    if (node.parent instanceof LayoutPage) {
      children = Object.values(state.nodeData)
        .filter((n) => n.pageKey === node.parent.pageKey && n.parentId === undefined)
        .map((n) => n.id);
    } else {
      const parentId = node.parent.id;
      children = Object.values(state.nodeData)
        .filter((n) => n.parentId === parentId)
        .map((n) => n.id);
    }

    const isOnBottom = children.indexOf(node.id) === children.length - 1;
    const isOnTop = children.indexOf(node.id) === 0;
    return { isOnBottom, isOnTop };
  });

  if (!textResourceBindings?.body && !textResourceBindings?.title) {
    window.logWarn('Unable to render panel component: no text resource binding found.');
    return null;
  }

  return (
    <ComponentStructureWrapper node={node}>
      <Panel
        title={textResourceBindings.title ? <Lang id={textResourceBindings.title} /> : undefined}
        showIcon={showIcon ?? true}
        variant={variant ?? PANEL_VARIANT.Info}
        forceMobileLayout={!fullWidth}
        isOnBottom={isOnBottom}
        isOnTop={isOnTop}
        fullWidth={fullWidth}
      >
        <Lang id={textResourceBindings.body} />
      </Panel>
    </ComponentStructureWrapper>
  );
};
