import * as React from 'react';
import components from './';

export interface IGenericComponentProps {
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
    return this.props.thirdPartyComponents[packageName][component];
  }
  
  public render() {
    if (this.props.component.component === 'ThirdParty') {
      return this.renderThirdPartyComponent();
    }

    const TagName = components.find((c: any) => c.name === this.props.component.component).Tag;
    const text = this.props.designMode ? this.props.component.title
      : this.props.getTextResource(this.props.component.title);
    return (
      <TagName
        component={this.props.component}
        text={text}
        size={this.props.component.size}
        handleDataChange={this.props.handleDataChange}
        isValid={this.props.isValid}
        formData={this.props.formData}
        getTextResource={this.props.getTextResource}
      />
    );
  }
}

export default GenericComponent;
