import React from 'react';

import { PANEL_VARIANT } from 'src/app-components/Panel/constants';
import { Panel } from 'src/app-components/Panel/Panel';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';
import type { PropsFromGenericComponent } from 'src/layout';

type IPanelProps = PropsFromGenericComponent<'Panel'>;

export const PanelComponent = ({ node }: IPanelProps) => {
  const { textResourceBindings, variant, showIcon, grid } = useNodeItem(node);
  const fullWidth = !grid && node.parent instanceof LayoutPage;

  const { isOnBottom, isOnTop } = useNodeTraversal((t) => {
    const parent = t.parents()[0];
    const children = t.with(parent).children();
    const isOnBottom = children.indexOf(node) === children.length - 1;
    const isOnTop = children.indexOf(node) === 0;
    return { isOnBottom, isOnTop };
  }, node);

  if (!textResourceBindings?.body && !textResourceBindings?.title) {
    window.logWarn('Unable to render panel component: no text resource binding found.');
    return null;
  }

  return (
    <ComponentStructureWrapper node={node}>
      <ConditionalWrapper
        condition={fullWidth}
        wrapper={(child) => (
          <FullWidthWrapper
            isOnBottom={isOnBottom}
            isOnTop={isOnTop}
          >
            {child}
          </FullWidthWrapper>
        )}
      >
        <Panel
          title={textResourceBindings.title ? <Lang id={textResourceBindings.title} /> : undefined}
          showIcon={showIcon ?? true}
          variant={variant ?? PANEL_VARIANT.Info}
          forceMobileLayout={!fullWidth}
        >
          <Lang id={textResourceBindings.body} />
        </Panel>
      </ConditionalWrapper>
    </ComponentStructureWrapper>
  );
};
