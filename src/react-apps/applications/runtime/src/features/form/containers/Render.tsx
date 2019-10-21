import * as React from 'react';
import { connect } from 'react-redux';
import { GenericComponent } from '../../../components/GenericComponent';
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
      <div className='col-12'>
        {layout && layout.map((component: ILayoutComponent | ILayoutGroup) => {
          if (component.type.toLowerCase() === 'group') {
            return (
              // TODO: Implement group features
              <></>
            );
          } else {
            return (
              <div className='row mt-2' key={component.id}>
                <div className='col'>
                  <div className='a-form-group'>
                    <GenericComponent
                      {...component as ILayoutComponent}
                    />
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
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
