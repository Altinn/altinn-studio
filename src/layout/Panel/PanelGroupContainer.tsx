import React from 'react';

import { Panel } from '@altinn/altinn-design-system';
import { Grid } from '@material-ui/core';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { getVariant } from 'src/components/form/Panel';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { GenericComponent } from 'src/layout/GenericComponent';
import { CustomIcon } from 'src/layout/Panel/CustomPanelIcon';
import classes from 'src/layout/Panel/Panel.module.css';
import { selectComponentTexts } from 'src/utils/formComponentUtils';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

interface PanelGroupConatinerProps {
  node: LayoutNodeFromType<'Group'>;
}

export const PanelGroupContainer = ({ node }: PanelGroupConatinerProps) => {
  const texts = useAppSelector((state) =>
    selectComponentTexts(state.textResources.resources, node.item.textResourceBindings),
  );
  const { iconUrl, iconAlt } = node.item.panel || {};
  const fullWidth = node.parent instanceof LayoutPage;
  const isOnBottom = node.parent.children().indexOf(node) === node.parent.children().length - 1;
  const isOnTop = node.parent.children().indexOf(node) === 0;

  return (
    <Grid
      item={true}
      xs={12}
      data-componentid={node.item.baseComponentId ?? node.item.id}
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
          title={texts.title}
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
            {texts.body && <span className={classes.panelBodyText}>{texts.body}</span>}
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
