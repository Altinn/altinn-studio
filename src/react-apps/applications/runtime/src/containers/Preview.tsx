import * as React from 'react';
import { connect } from 'react-redux';
import { IRuntimeState } from '../reducers';
import { Container } from './Container';

export interface IPreviewProps {
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
      <Container />
    );
  }
}

const makeMapStateToProps = () => {
  const mapStateToProps = (state: IRuntimeState, empty: any): IPreviewProps => {
    return {
      layoutOrder: state.formLayout.order || [],
      components: [],
      containers: [],
    };
  };
  return mapStateToProps;
};

export const Preview = connect(makeMapStateToProps)(PreviewComponent);
