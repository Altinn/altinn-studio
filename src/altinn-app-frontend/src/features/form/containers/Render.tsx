import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { connect } from 'react-redux';
import GenericComponent from '../../../components/GenericComponent';
import { makeGetLayout } from '../../../selectors/getLayoutData';
import { IRuntimeState } from '../../../types';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';

export interface IRenderProps {
  layout: ILayout;
  textResources: any;
}

export class RenderComponent extends React.Component<IRenderProps, null> {
  public render(): JSX.Element {
    const { layout } = this.props;
    return (
      <Grid container={true}>
        {layout && layout.map((component: ILayoutComponent | ILayoutGroup) => {
          if (component.type.toLowerCase() === 'group') {
            return (
              // TODO: Implement group features
              <></>
            );
          } else {
            return (
              <Grid item={true} key={component.id} xs={12}>
                <div className='form-group a-form-group'>
                  <GenericComponent
                    {...component as ILayoutComponent}
                  />
                </div>
              </Grid>
            );
          }
        })}
      </Grid>
    );
  }
}

const makeMapStateToProps = () => {
  const getLayout = makeGetLayout();
  const mapStateToProps = (state: IRuntimeState): IRenderProps => {
    return {
      layout: getLayout(state),
      textResources: state.textResources.resources,
    };
  };
  return mapStateToProps;
};

export default connect(makeMapStateToProps)(RenderComponent);
