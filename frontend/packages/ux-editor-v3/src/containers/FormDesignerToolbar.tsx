import React from 'react';
import { LayoutSetsContainer } from '../components/Elements/LayoutSetsContainer';
import { useLayoutSetsQuery } from '../hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './FormDesignerToolbar.module.css';

export const FormDesignerToolbar = () => {
  const { org, app } = useStudioEnvironmentParams();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery?.data?.sets;

  return <div className={classes.toolbar}>{layoutSetNames && <LayoutSetsContainer />}</div>;
};
