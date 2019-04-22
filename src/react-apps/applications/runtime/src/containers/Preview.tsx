import * as React from 'react';
import { connect } from 'react-redux';
import { GenericComponentWrapper } from '../components/GenericComponent';
import { Container } from './Container';

import { ILayout } from '../features/form/layout/types';
import { IRuntimeState } from '../types';
export interface IPreviewProps {
  layout: ILayout;
}

export class PreviewComponent extends React.Component<IPreviewProps, null> {
  public render(): JSX.Element {
    const { layout } = this.props;
    return (
      <>
        {layout.map((component: any) => {
          if (component.type === 'Container') {
            return (
              <Container
                {...component}
              />
            );
          } else {
            return (
              <GenericComponentWrapper
                {...component}
              />
            );
          }
        })}
      </>
    );
  }
}

const mapStateToProps = (state: IRuntimeState): IPreviewProps => {
  return {
    layout: state.formLayout.layout,
  };
};

export default connect(mapStateToProps)(PreviewComponent);
