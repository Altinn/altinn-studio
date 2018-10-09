import * as React from 'react';
import { connect } from 'react-redux';
import { Container } from './Container';

export interface IPreviewProps {
  designMode: boolean;
  layoutOrder: any;
  components: any;
  containers: any;
}
export interface IPreviewState { }

export class PreviewComponent extends React.Component<
  IPreviewProps,
  IPreviewState
  > {
  public render() {
    return (
      <div className='col-12'>
        {this.renderContainer()}
      </div>
    );
  }

  public renderContainer = (): JSX.Element => {
    const baseContainerId = Object.keys(this.props.layoutOrder) ? Object.keys(this.props.layoutOrder)[0] : null;
    if (!baseContainerId) return null;
    return (
      <Container
        id={baseContainerId}
        baseContainer={true}
      />
    );
  }
}

const mapStateToProps = (state: IAppState, empty: any): IPreviewProps => {
  return {
    layoutOrder: state.formDesigner.layout.order,
    components: state.formDesigner.layout.components,
    containers: state.formDesigner.layout.containers,
    designMode: state.appData.appConfig.designMode,
  };
};

export const Preview = connect(mapStateToProps)(PreviewComponent);
