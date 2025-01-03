import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './FormDesignerToolbar.module.css';
import { LayoutSetsContainer } from '../components/Elements/LayoutSetsContainer';
import { ToggleAddComponentPoc } from './DesignView/AddItem/ToggleAddComponentPoc';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';

export const FormDesignerToolbar = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsExtended } = useLayoutSetsExtendedQuery(org, app);
  const layoutSetNames = layoutSetsExtended?.sets;

  return (
    <section className={classes.toolbar}>
      {layoutSetNames && <LayoutSetsContainer />}
      {/* POC of new design for adding components*/}
      <ToggleAddComponentPoc />
    </section>
  );
};
