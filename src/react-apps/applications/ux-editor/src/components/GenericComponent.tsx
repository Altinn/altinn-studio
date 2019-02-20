import * as React from 'react';
import { connect } from 'react-redux';
import { thirdPartyComponentWithElementHandler } from '../containers/thirdPartyComponentWithDataHandler';
import { formComponentWithHandlers } from '../containers/withFormElementHandlers';
import components from './';

export interface IProvidedProps {
  id: string;
  component: FormComponentType;
  isValid: boolean;
  formData: any;
  designMode: boolean;
  handleDataChange: (callbackValue: any) => void;
  getTextResource: (key: string) => string;
}

export interface IGenericComponentProps extends IProvidedProps {
  thirdPartyComponents?: any;
}

class Generic extends React.Component<IGenericComponentProps> {

  public renderThirdPartyComponent = (): JSX.Element => {
    const [packageName, component] = this.props.component.textResourceBindings.title.split(' - ');
    if (!this.props.thirdPartyComponents || !this.props.thirdPartyComponents[packageName]
      || !this.props.thirdPartyComponents[packageName][component]) {
      return null;
    }
    return thirdPartyComponentWithElementHandler(this.props.thirdPartyComponents[packageName][component],
      this.props.handleDataChange);
  }

  public render() {
    if (this.props.component.component === 'ThirdParty') {
      return this.renderThirdPartyComponent();
    }
    const TagName = formComponentWithHandlers(components.find((c: any) => c.name ===
      this.props.component.component).Tag);
    return (
      <TagName
        id={this.props.id}
        component={this.props.component}
        isValid={this.props.isValid}
        formData={this.props.formData}
        getTextResource={this.props.getTextResource}
        handleDataChange={this.props.handleDataChange}
      />
    );
  }
}
const makeMapStateToProps = () => {
  const mapStateToProps = (state: IAppState, props: IProvidedProps): IGenericComponentProps => ({
    id: props.id,
    component: props.component,
    isValid: props.isValid,
    formData: props.formData,
    designMode: props.designMode,
    thirdPartyComponents: state.appData.thirdPartyComponents.components,
    handleDataChange: props.handleDataChange,
    getTextResource: props.getTextResource,
  });
  return mapStateToProps;
};

export const GenericComponent = connect(makeMapStateToProps)(Generic);
