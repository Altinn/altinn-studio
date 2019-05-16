import * as React from 'react';
import { connect } from 'react-redux';
import { GenericComponentWrapper } from '../components/GenericComponent';
import { ILayout, ILayoutComponent, ILayoutContainer } from '../features/form/layout/types';
import { IRuntimeState } from '../types';
export interface IRenderProps {
  layout: ILayout;
  textResources: any;
}

export class RenderComponent extends React.Component<IRenderProps, null> {
  public render(): JSX.Element {
    const { layout } = this.props;
    return (
      <div className='col-12'>
        {layout && layout.map((component: ILayoutComponent | ILayoutContainer) => {
          if (component.hidden) {
            return null;
          }
          if (component.type === 'Container') {
            return (
              // TODO: Implement container features
              <></>
            );
          } else {
            return (
              <div className='row mt-2' key={component.id}>
                <div className='col'>
                  <div className='a-form-group'>
                    <GenericComponentWrapper
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

const mapStateToProps = (state: IRuntimeState): IRenderProps => {
  return {
    layout: state.formLayout.layout,
    textResources: state.formResources.languageResource.resources,
  };
};

export default connect(mapStateToProps)(RenderComponent);
