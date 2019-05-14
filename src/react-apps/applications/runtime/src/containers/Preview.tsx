import * as React from 'react';
import { connect } from 'react-redux';
import { GenericComponentWrapper } from '../components/GenericComponent';
import { Container } from './Container';

import { ILayout } from '../features/form/layout/types';
import { IRuntimeState } from '../types';
export interface IPreviewProps {
  layout: ILayout;
  textResources: any;
}

export class PreviewComponent extends React.Component<IPreviewProps, null> {
  public render(): JSX.Element {
    const { layout } = this.props;
    return (
      <div className='col-12'>
        {layout && layout.map((component: any) => {
          console.log(component);
          if (component.component === 'Container') {
            return (
              <Container
                {...component}
              />
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

const mapStateToProps = (state: IRuntimeState): IPreviewProps => {
  return {
    layout: state.formLayout.layout,
    textResources: state.formResources.languageResource.resources,
  };
};

export default connect(mapStateToProps)(PreviewComponent);
