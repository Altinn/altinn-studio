import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type {
  ILayout,
  ILayoutComponent,
  ILayoutComponentOrGroup,
  ILayoutGroup,
} from 'src/features/form/layout';

export type ComponentFromSummary = ILayoutComponentOrGroup & {
  formData?: any;
  index?: number;
  parentGroup?: string;
};

export interface IDisplayGroupContainer {
  container: ILayoutGroup;
  components: ComponentFromSummary[];
  renderLayoutComponent: (
    components: ILayoutComponent | ILayoutGroup,
    layout: ILayout,
  ) => JSX.Element;
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
  const GetHiddenSelector = makeGetHidden();
  const hidden: boolean = useAppSelector((state) =>
    GetHiddenSelector(state, { id: props.container.id }),
  );
  const classes = useStyles();
  const title = useAppSelector((state) => {
    const titleKey = props.container.textResourceBindings?.title;
    if (titleKey && state.language.language) {
      return getTextFromAppOrDefault(
        titleKey,
        state.textResources.resources,
        state.language.language,
        [],
        true,
      );
    }
    return undefined;
  });
  const layout = useAppSelector(
    (state) =>
      state.formLayout.layouts &&
      state.formLayout.layouts[state.formLayout.uiConfig.currentView],
  );

  if (hidden || !layout) {
    return null;
  }

  return (
    <Grid
      container={true}
      item={true}
      id={props.container.id}
      className={classes.groupContainer}
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
            variant='body1'
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
