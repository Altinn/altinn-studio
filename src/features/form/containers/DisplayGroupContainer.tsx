import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { useAppSelector } from 'src/common/hooks';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayout, ILayoutComponent, ILayoutComponentOrGroup } from 'src/layout/layout';

export type ComponentFromSummary = ILayoutComponentOrGroup & {
  formData?: any;
  parentGroup?: string;
};

export interface IDisplayGroupContainer {
  id?: string;
  container: ILayoutGroup;
  components: ComponentFromSummary[];
  renderLayoutComponent: (components: ILayoutComponent | ILayoutGroup, layout: ILayout) => JSX.Element;
}

const useStyles = makeStyles({
  groupTitle: {
    fontWeight: 700,
    fontSize: '1.5rem',
    paddingBottom: 12,
  },
  groupContainer: {
    paddingBottom: 38,
  },
});

export function DisplayGroupContainer(props: IDisplayGroupContainer) {
  const container = useResolvedNode(props.container)?.item;

  const GetHiddenSelector = makeGetHidden();
  const hidden: boolean = useAppSelector((state) => GetHiddenSelector(state, { id: props.container.id }));
  const classes = useStyles();
  const title = useAppSelector((state) => {
    const titleKey = container?.textResourceBindings?.title;
    if (titleKey && state.language.language) {
      return getTextFromAppOrDefault(titleKey, state.textResources.resources, state.language.language, [], true);
    }
    return undefined;
  });
  const layout = useAppSelector(
    (state) => state.formLayout.layouts && state.formLayout.layouts[state.formLayout.uiConfig.currentView],
  );

  if (hidden || !layout || !container) {
    return null;
  }

  return (
    <Grid
      container={true}
      item={true}
      id={props.id || container.id}
      className={cn(classes.groupContainer, pageBreakStyles(container))}
      spacing={3}
      alignItems='flex-start'
      data-testid='display-group-container'
    >
      {title && (
        <Grid
          item={true}
          xs={12}
        >
          <Typography
            className={classes.groupTitle}
            variant='h2'
          >
            {title}
          </Typography>
        </Grid>
      )}
      {props.components.map((component) => {
        return props.renderLayoutComponent(component, layout);
      })}
    </Grid>
  );
}
