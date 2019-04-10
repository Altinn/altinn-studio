import * as React from 'react';
import { connect } from 'react-redux';
import { thirdPartyComponentWithElementHandler } from '../../srcOld/containers/thirdPartyComponentWithDataHandler';
import { formComponentWithHandlers } from '../containers/withFormElementHandlers';
import { IRuntimeState } from '../reducers';
import components from './';

export interface IGenericComponentProps {
  id: string;
  component: FormComponentType;
  isValid: boolean;
  formData: any;
  validationMessages?: IComponentValidations;
  handleDataChange: (callbackValue: any) => void;
  getTextResource: (key: string) => string;
  thirdPartyComponents?: any;
  language?: any;
}

class GenericComponent extends React.Component<IGenericComponentProps> {

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
    console.log(this.props.component);
    return (
      <TagName
        id={this.props.id}
        component={this.props.component}
        isValid={this.props.isValid}
        formData={this.props.formData}
        getTextResource={this.props.getTextResource}
        handleDataChange={this.props.handleDataChange}
        validationMessages={this.props.validationMessages}
        language={this.props.language}
      />
    );
  }
}
const makeMapStateToProps = () => {
  const mapStateToProps = (state: IRuntimeState, props: IGenericComponentProps): IGenericComponentProps => ({
    ...props,
    // thirdPartyComponents: state.appData.thirdPartyComponents.components,
    language: state.language.language,
  });
  return mapStateToProps;
};

export const GenericComponentWrapper = connect(makeMapStateToProps)(GenericComponent);
