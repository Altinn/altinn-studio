import * as React from 'react';
import { connect } from 'react-redux';
import formDesignerActionDispatcher from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { makeGetDesignModeSelector } from '../selectors/getAppData';
import { makeGetLayoutComponentsSelector, makeGetLayoutContainersSelector, makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
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
      <>
        {this.renderContainer()}
      </>
    );
  }

  public componentWillMount() {
    if (!Object.keys(this.props.layoutOrder).length) {
      // Create baseContainer if it doesn't exist
      formDesignerActionDispatcher.addFormContainer({
        repeating: false,
        dataModelGroup: null,
        index: 0,
      });
    }
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
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const GetDesignModeSelector = makeGetDesignModeSelector();
  const mapStateToProps = (state: IAppState, empty: any): IPreviewProps => {
    return {
      layoutOrder: GetLayoutOrderSelector(state),
      components: GetLayoutComponentsSelector(state),
      containers: GetLayoutContainersSelector(state),
      designMode: GetDesignModeSelector(state),
    };
  };
  return mapStateToProps;
};

export const Preview = connect(makeMapStateToProps)(PreviewComponent);
