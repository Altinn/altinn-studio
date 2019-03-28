import * as React from 'react';
import { connect } from 'react-redux';
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
      <Container
        id={baseContainerId}
        baseContainer={true}
      />
    );
  }
}

const makeMapStateToProps = () => {
  const mapStateToProps = (state: any, empty: any): IPreviewProps => {
    return {
      layoutOrder: [],
      components: [],
      containers: [],
    };
  };
  return mapStateToProps;
};

export const Preview = connect(makeMapStateToProps)(PreviewComponent);
