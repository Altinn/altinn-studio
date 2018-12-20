import * as React from 'react';
import { connect } from 'react-redux';
import { makeGetDesignModeSelector } from '../selectors/getAppData';
import { makeGetLayoutComponentsSelector, makeGetLayoutContainersSelector, makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
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
  public render(): JSX.Element {
    const baseContainerId = Object.keys(this.props.layoutOrder).length > 0 ?
      Object.keys(this.props.layoutOrder)[0] :
      null;
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
    const layoutOrder = GetLayoutOrderSelector(state);
    return {
      layoutOrder,
      components: GetLayoutComponentsSelector(state),
      containers: GetLayoutContainersSelector(state),
      designMode: GetDesignModeSelector(state),
    };
  };
  return mapStateToProps;
};

export const Preview = connect(makeMapStateToProps)(PreviewComponent);
