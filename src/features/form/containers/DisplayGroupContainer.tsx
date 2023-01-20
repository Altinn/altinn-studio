import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { useAppSelector } from 'src/common/hooks';
import { useExpressionsForComponent } from 'src/features/expressions/useExpressions';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import printStyles from 'src/styles/print.module.css';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayout, ILayoutComponent, ILayoutComponentOrGroup } from 'src/layout/layout';

export type ComponentFromSummary = ILayoutComponentOrGroup & {
  formData?: any;
  index?: number;
  parentGroup?: string;
};

export interface IDisplayGroupContainer {
  container: ILayoutGroup;
  components: ComponentFromSummary[];
  renderLayoutComponent: (components: ILayoutComponent | ILayoutGroup, layout: ILayout) => JSX.Element;
}

const useStyles = makeStyles({
  groupTitle: {
    fontWeight: 700,
    fontSize: '2.4rem',
    paddingBottom: 12,
  },
  groupContainer: {
    paddingBottom: 38,
  },
});

export function DisplayGroupContainer(props: IDisplayGroupContainer) {
  const container = useExpressionsForComponent(props.container);

  const GetHiddenSelector = makeGetHidden();
  const hidden: boolean = useAppSelector((state) => GetHiddenSelector(state, { id: props.container.id }));
  const classes = useStyles();
  const title = useAppSelector((state) => {
    const titleKey = container.textResourceBindings?.title;
    if (titleKey && state.language.language) {
      return getTextFromAppOrDefault(titleKey, state.textResources.resources, state.language.language, [], true);
    }
    return undefined;
  });
  const layout = useAppSelector(
    (state) => state.formLayout.layouts && state.formLayout.layouts[state.formLayout.uiConfig.currentView],
  );

  if (hidden || !layout) {
    return null;
  }

  return (
    <Grid
      container={true}
      item={true}
      id={props.container.id}
      className={cn(classes.groupContainer, {
        [printStyles['break-before']]: container.pageBreak?.breakBefore,
        [printStyles['break-after']]: container.pageBreak?.breakAfter,
      })}
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
