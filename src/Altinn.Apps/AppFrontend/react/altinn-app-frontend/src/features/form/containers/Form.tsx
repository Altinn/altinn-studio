import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import GenericComponent from '../../../components/GenericComponent';
import { IRuntimeState } from '../../../types';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';

export function Form() {
  const [renderLayout, setRenderLayout] = React.useState<any[]>([]);

  const layout: ILayout = useSelector((state: IRuntimeState) => state.formLayout.layout);
  const hiddenComponents: string[] = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.hiddenFields);

  React.useEffect(() => {
    let componentsToRender: any[] = layout;
    
    if (layout && hiddenComponents) {
      componentsToRender = layout.filter((component) => !hiddenComponents.includes(component.id));
    }
    setRenderLayout(componentsToRender);
  }, [layout, hiddenComponents])

  function renderLayoutComponent(component: ILayoutComponent | ILayoutGroup) {
    if (component.type.toLowerCase() === 'group') {
      return (
        // TODO: Implement group features
        <></>
      );
    }

    return (
      <Grid item={true} xs={12} key={'grid-' + component.id}>
        <div key={'form-' + component.id} className='form-group a-form-group'>
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
      {renderLayout && renderLayout.map(renderLayoutComponent)}
    </Grid>
  );
}

export default Form;
