import * as React from 'react';
import { Grid } from '@material-ui/core';
import { ILayouts, ILayoutComponent } from '../../features/form/layout';
// eslint-disable-next-line import/no-cycle
import { GenericComponent } from '../../components/GenericComponent';

export function getLayoutComponentById(id: string, layouts: ILayouts): ILayoutComponent {
  let component: ILayoutComponent;
  Object.keys(layouts).forEach((layoutId) => {
    if (!component) {
      component = layouts[layoutId].find((element) => {
        // Check against provided id, with potential -{index} postfix.
        const match = matchLayoutComponent(id, element.id);
        return match && match.length > 0;
      }) as ILayoutComponent;
    }
  });

  return component;
}

/*
  Check if provided id matches component id.
  For repeating groups, component id from formLayout is postfixed with -{index}
  when rendering, where index is the component's index (number) in the repeating group list.
  This does not change the component definition in formLayout.
  Therefore, we must match on component id as well as a potential -{index} postfix
  when searching through formLayout for the component definition.
*/
export function matchLayoutComponent(providedId: string, componentId: string) {
  return providedId.match(`${componentId}(-[0-9]*)*$`);
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
