import * as React from 'react';
import { Grid } from '@material-ui/core';
import { ILayout, ILayoutComponent } from '../../features/form/layout';
import { GenericComponent } from '../../components/GenericComponent';

export function getLayoutComponentById(id: string, layout: ILayout): ILayoutComponent {
  const component: ILayoutComponent = layout.find((element) => element.id === id) as ILayoutComponent;
  return component;
}

export function renderGenericComponent(component: ILayoutComponent) {
  return (
    <Grid
      item={true}
      xs={12}
      key={`grid-${component.id}`}
    >
      <div key={`form-${component.id}`} className='form-group a-form-group'>
        <GenericComponent
          key={component.id}
          {...component}
        />
      </div>
    </Grid>
  );
}
