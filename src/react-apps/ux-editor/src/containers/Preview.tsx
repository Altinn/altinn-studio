import * as React from 'react';
import { connect } from 'react-redux';
import { FormComponentWrapper } from '../components';

export interface IPreviewProps {
  designMode: boolean;
  componentOrder: string[];
  components: any;
}
export interface IPreviewState { }

export class PreviewComponent extends React.Component<
  IPreviewProps,
  IPreviewState
  > {
  public render() {
    return (
      <div className='col-12'>
        {this.props.componentOrder.map((id, index) => (
          this.props.components[id].hidden && !this.props.designMode ? null : (
            <FormComponentWrapper
              key={index}
              id={id}
            />
          )
        ))}
      </div>
    );
  }
}

const mapStateToProps = (state: IAppState, empty: any): IPreviewProps => {
  return {
    componentOrder: state.formDesigner.layout.order,
    components: state.formDesigner.layout.components,
    designMode: state.appData.appConfig.designMode,
  };
};

export const Preview = connect(mapStateToProps)(PreviewComponent);
