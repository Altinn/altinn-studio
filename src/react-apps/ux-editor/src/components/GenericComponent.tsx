import * as React from 'react';
import components from './';
import { formComponentWithHandlers } from '../containers/withFormElementHandlers';
import { thirdPartyComponentWithElementHandler } from '../containers/thirdPartyComponentWithDataHandler';

export interface IGenericComponentProps {
  id: string;
  component: FormComponentType;
  isValid: boolean;
  formData: any;
  designMode: boolean;
  thirdPartyComponents?: any;
  handleDataChange: (callbackValue: any) => void;
  getTextResource: (key: string) => string;
}

class GenericComponent extends React.Component<IGenericComponentProps> {

  public renderThirdPartyComponent = (): JSX.Element => {
    const [packageName, component] = this.props.component.title.split('.');
    if (!this.props.thirdPartyComponents || !this.props.thirdPartyComponents[packageName]
      || !this.props.thirdPartyComponents[packageName][component]) {
      return null;
    }
    return thirdPartyComponentWithElementHandler(this.props.thirdPartyComponents[packageName][component], this.props.handleDataChange);
  }

  public render() {
    if (this.props.component.component === 'ThirdParty') {
      return this.renderThirdPartyComponent();
    }

    const TagName = formComponentWithHandlers(components.find((c: any) => c.name === this.props.component.component).Tag);
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

export default GenericComponent;
