import React from 'react';

import { Panel } from '@altinn/altinn-design-system';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { getVariant } from 'src/components/form/Panel';
import classes from 'src/layout/Panel/Panel.module.css';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
type IPanelProps = PropsFromGenericComponent<'Panel'>;

export const PanelComponent = ({ getTextResource, node }: IPanelProps) => {
  const { textResourceBindings, variant, showIcon } = node.item;

  const fullWidth = !node.item.grid && node.parent instanceof LayoutPage;
  const isOnBottom = node.parent.children().indexOf(node) === node.parent.children().length - 1;
  const isOnTop = node.parent.children().indexOf(node) === 0;

  if (!textResourceBindings) {
    return null;
  }

  return (
    <ConditionalWrapper
      condition={fullWidth}
      wrapper={(child) => (
        <FullWidthWrapper
          className={classes.panelPadding}
          isOnBottom={isOnBottom}
          isOnTop={isOnTop}
        >
          {child}
        </FullWidthWrapper>
      )}
    >
      <Panel
        title={getTextResource(textResourceBindings.title)}
        showIcon={showIcon}
        variant={getVariant({ variant })}
        forceMobileLayout={!fullWidth}
      >
        {getTextResource(textResourceBindings.body)}
      </Panel>
    </ConditionalWrapper>
  );
};
