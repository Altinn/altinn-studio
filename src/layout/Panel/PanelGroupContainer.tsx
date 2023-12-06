import React from 'react';

import { Panel } from '@altinn/altinn-design-system';
import { Grid } from '@material-ui/core';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { getVariant } from 'src/components/form/Panel';
import { Lang } from 'src/features/language/Lang';
import { GenericComponent } from 'src/layout/GenericComponent';
import { CustomIcon } from 'src/layout/Panel/CustomPanelIcon';
import classes from 'src/layout/Panel/Panel.module.css';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { CompGroupNonRepeatingPanelInternal } from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';

interface PanelGroupContainerProps {
  node: LayoutNodeForGroup<CompGroupNonRepeatingPanelInternal>;
}

export const PanelGroupContainer = ({ node }: PanelGroupContainerProps) => {
  const { iconUrl, iconAlt } = node.item.panel || {};
  const fullWidth = node.parent instanceof LayoutPage;
  const isOnBottom = node.parent.children().indexOf(node) === node.parent.children().length - 1;
  const isOnTop = node.parent.children().indexOf(node) === 0;

  return (
    <Grid
      item={true}
      xs={12}
      data-componentid={node.item.id}
    >
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
          title={<Lang id={node.item.textResourceBindings?.title} />}
          renderIcon={
            iconUrl
              ? ({ size }) => (
                  <CustomIcon
                    iconUrl={iconUrl}
                    iconAlt={iconAlt}
                    size={size}
                  />
                )
              : undefined
          }
          showIcon={node.item.panel?.showIcon}
          variant={getVariant({ variant: node.item.panel?.variant })}
        >
          <Grid
            container={true}
            spacing={3}
            data-testid='panel-group-container'
          >
            {node.item.textResourceBindings?.body && (
              <div className={classes.panelBodyText}>
                <Lang id={node.item.textResourceBindings?.body} />
              </div>
            )}
            {node.children().map((child) => (
              <GenericComponent
                key={node.item.id}
                node={child}
              />
            ))}
          </Grid>
        </Panel>
      </ConditionalWrapper>
    </Grid>
  );
};
