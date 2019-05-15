import * as React from 'react';
import { connect } from 'react-redux';
import { GenericComponentWrapper } from '../components/GenericComponent';
import { ILayout } from '../features/form/layout/types';
import { IRuntimeState } from '../types';
import { makeGetFormDataSelector } from '../selectors/getFormData';
export interface IRenderProps {
  layout: ILayout;
  textResources: any;
}

export class RenderComponent extends React.Component<IRenderProps, null> {
  public render(): JSX.Element {
    const { layout } = this.props;
    return (
      <div className='col-12'>
        {layout && layout.map((component: any) => {
          if (component.component === 'Container') {
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
                      {...component}
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
  const GetFormDataSelector = makeGetFormDataSelector();
  const mapStateToProps = (state: IRuntimeState, props: IRenderProps): IRenderProps => {
    return {
      layout: state.formLayout.layout,
      textResources: state.formResources.languageResource.resources,
    };
  };
  return mapStateToProps;
};

export default connect(makeMapStateToProps)(RenderComponent);
