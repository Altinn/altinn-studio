import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './FormDesignerToolbar.module.css';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { LayoutSetsContainer } from '../components/Elements/LayoutSetsContainer';

export const FormDesignerToolbar = () => {
  const { org, app } = useStudioEnvironmentParams();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery?.data?.sets;

  return <section className={classes.toolbar}>{layoutSetNames && <LayoutSetsContainer />}</section>;
};
