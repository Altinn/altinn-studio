import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import GenericComponent from '../../../components/GenericComponent';
import { IRuntimeState } from '../../../types';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';

export function RenderComponent(props: any) {
  const layout: ILayout = useSelector((state: IRuntimeState) => state.formLayout.layout);

  function renderComponent(component: ILayoutComponent | ILayoutGroup) {
    if (component.type.toLowerCase() === 'group') {
      return (
        // TODO: Implement group features
        <></>
      );
    }

    return (
      <Grid item={true} xs={12} key={component.id}>
        <div className='form-group a-form-group'>
          <GenericComponent
            key={component.id}
            {...component as ILayoutComponent}
          />
        </div>
      </Grid>
    );
  }

  return (
    <Grid container={true}>
      {layout && layout.map(renderComponent)}
    </Grid>
  );
}

export default RenderComponent;
