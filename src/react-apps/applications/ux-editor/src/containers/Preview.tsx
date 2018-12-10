import * as React from 'react';
import { connect } from 'react-redux';
import formDesignerActionDispatcher from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { makeGetDesignModeSelector } from '../selectors/getAppData';
import { makeGetLayoutComponentsSelector, makeGetLayoutContainersSelector/*, makeGetLayoutOrderSelector*/ } from '../selectors/getLayoutData';
import { Container } from './Container';

export interface IPreviewProps {
  designMode: boolean;
  layoutOrder: any;
  components: any;
  containers: any;
}

export class PreviewComponent extends React.Component<
  IPreviewProps,
  null
  > {

  public componentDidUpdate() {
    if (!Object.keys(this.props.layoutOrder).length) {
      formDesignerActionDispatcher.addFormContainer({
        repeating: false,
        dataModelGroup: null,
        index: 0,
      });
    }
  }

  public render() {
    return (
      <div className='col-12'>
        {this.renderContainer()}
      </div>
    );
  }

  public renderContainer = (): JSX.Element => {
    const baseContainerId = Object.keys(this.props.layoutOrder) ? Object.keys(this.props.layoutOrder)[0] : null;
    if (!baseContainerId) {
      return null;
    }
    return (
      <Container
        id={baseContainerId}
        baseContainer={true}
      />
    );
  }
}

const makeMapStateToProps = () => {
  const GetLayoutComponentsSelector = makeGetLayoutComponentsSelector();
  const GetLayoutContainersSelector = makeGetLayoutContainersSelector();
  // const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const GetDesignModeSelector = makeGetDesignModeSelector();
  const mapStateToProps = (state: IAppState, empty: any): IPreviewProps => {
    return {
      layoutOrder: state.formDesigner.layout.order,
      components: GetLayoutComponentsSelector(state),
      containers: GetLayoutContainersSelector(state),
      designMode: GetDesignModeSelector(state),
    };
  };
  return mapStateToProps;
};

export const Preview = connect(makeMapStateToProps)(PreviewComponent);
