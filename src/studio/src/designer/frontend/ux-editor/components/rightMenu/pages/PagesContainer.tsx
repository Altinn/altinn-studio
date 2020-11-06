/* eslint-disable react/jsx-props-no-spreading */
import { Grid } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import PageElement from './PageElement';

export default function PagesContainer() {
  const layoutOrder: string[] = useSelector((state: IAppState) => state.formDesigner.layout.layoutOrder);

  return (
    <Grid
      container={true}
    >
      {layoutOrder.map((layout: string) => {
        return (
          <PageElement name={layout} key={layout}/>
        );
      })}
    </Grid>
  );
}
