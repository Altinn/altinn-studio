import { Grid, Typography, makeStyles } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { IRuntimeState } from 'src/types';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';

export interface IDisplayGroupContainer {
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
  // eslint-disable-next-line no-undef
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
  const GetHiddenSelector = makeGetHidden();
  const hidden: boolean = useSelector((state: IRuntimeState) => GetHiddenSelector(state, { id: props.container.id }));
  const classes = useStyles();
  const title = useSelector((state: IRuntimeState) => {
    const titleKey = props.container.textResourceBindings?.title;
    if (titleKey) {
      return getTextFromAppOrDefault(titleKey, state.textResources.resources, state.language.language, [], true);
    }
    return undefined;
  });
  const layout = useSelector((state: IRuntimeState) => state.formLayout.layouts[state.formLayout.uiConfig.currentView]);

  if (hidden) {
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
    >
      <Grid item={true} xs={12}>
        {title &&
        <Typography className={classes.groupTitle} variant='body1'>
          {title}
        </Typography>}
      </Grid>
      {props.components.map((component) => {
        return props.renderLayoutComponent(component, layout);
      })}
    </Grid>
  );
}
