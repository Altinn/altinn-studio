import React from 'react';
import { Grid } from '@mui/material';
import { useSelector } from 'react-redux';
import PageElement from './PageElement';
import type { IAppState } from '../../../types/global';

export default function PagesContainer() {
  const layoutOrder: string[] = useSelector((state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order);
  const invalidLayouts: string[] = useSelector((state: IAppState) => state.formDesigner.layout.invalidLayouts);

  return (
    <Grid container={true}>
      {layoutOrder.map((layout: string) => {
        const invalid = invalidLayouts.includes(layout);
        return <PageElement name={layout} key={layout} invalid={invalid} />;
      })}
    </Grid>
  );
}
