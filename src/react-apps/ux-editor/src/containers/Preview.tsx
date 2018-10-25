import * as React from 'react';
import { connect } from 'react-redux';
import {makeGetDesignModeSelector} from '../selectors/getAppData';
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
