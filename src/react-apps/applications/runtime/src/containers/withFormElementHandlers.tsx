import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { IDataModelBindings, ILayout, ILayoutComponent, ITextResourceBindings } from '../features/form/layout/';
import { makeGetLayout } from '../selectors/getLayoutData';
import { makeGetComponentValidationsSelector } from '../selectors/getValidations';
import { IRuntimeState } from '../types';
import { IComponentValidations } from '../types/global';
import { renderValidationMessagesForComponent } from '../utils/render';

export interface IProvidedProps {
  id: string;
  handleDataUpdate: (data: any) => void;
  dataModelBindings: IDataModelBindings;
  componentValidations: IComponentValidations;
  textResourceBindings: ITextResourceBindings;
  required: boolean;
  type: string;
  layout: ILayout;
}

export interface IProps extends IProvidedProps {
  language: any;
  textResources: any[];
}

export const formComponentWithHandlers = (WrappedComponent: React.ComponentType<any>): React.ComponentClass<any> => {
  class FormComponentWithHandlers extends React.Component<IProps> {
    public renderLabel = (): JSX.Element => {
      if (this.props.type === 'Header' ||
        this.props.type === 'Paragraph' ||
        this.props.type === 'Submit' ||
        this.props.type === 'ThirdParty' ||
        this.props.type === 'AddressComponent' ||
        this.props.type === 'Button') {
        return null;
      }
      if (!this.props.textResourceBindings.title) {
        return null;
      }
      if (this.props.textResourceBindings.title) {
        const label: string = this.getTextResource(this.props.textResourceBindings.title);
        return (
          <label className='a-form-label title-label' htmlFor={this.props.id}>
            {label}
            {this.props.required ? null :
              <span className='label-optional'>({getLanguageFromKey('general.optional', this.props.language)})</span>
            }
          </label>
        );
      }

      return null;
    }
    public renderDescription = (): JSX.Element => {
      if (!this.props.textResourceBindings.title) {
        return null;
      }
      if (this.props.textResourceBindings.description) {
        const description: string = this.getTextResource(this.props.textResourceBindings.description);
        return (
          <span className='a-form-label description-label'>{description}</span>
        );
      }

      return null;
    }

    public handleDataUpdate = (data: any) => this.props.handleDataUpdate(data);

    public getTextResource = (resourceKey: string): string => {
      const textResource = this.props.textResources.find((resource) => resource.id === resourceKey);
      return textResource ? textResource.value : resourceKey;
    }

    public render(): JSX.Element {
      const { id, ...passThroughProps } = this.props;
      const text = this.getTextResource(this.props.textResourceBindings.title);

      return (
        <>
          {this.renderLabel()}
          {this.renderDescription()}
          <WrappedComponent
            id={id}
            text={text}
            handleDataChange={this.handleDataUpdate}
            {...passThroughProps}
          />
          {this.errorMessage()}
        </>
      );
    }

    private hasValidationMessages = () => {
      if (!this.props.componentValidations) {
        return false;
      }
      let hasMessages = false;
      Object.keys(this.props.componentValidations).forEach((key: string) => {
        if (this.props.componentValidations[key].errors.length > 0
          || this.props.componentValidations[key].warnings.length > 0) {
          hasMessages = true;
          return;
        }
      });

      return hasMessages;
    }

    private isSimpleComponent(): boolean {
      const component = this.props.layout.find((element) => element.id === this.props.id) as ILayoutComponent;
      if (!component || !component.dataModelBindings) {
        return false;
      }
      const simpleBinding = component.dataModelBindings.simpleBinding;
      const type = component.type;
      return simpleBinding && type !== 'Checkboxes' && type !== 'RadioButtons' && type !== 'FileUpload';
    }

    private errorMessage(): JSX.Element[] {
      if (!this.isSimpleComponent() ||
        !this.hasValidationMessages()) {
        return null;
      }
      return renderValidationMessagesForComponent(this.props.componentValidations.simpleBinding, this.props.id);
    }

  }
  const makeMapStateToProps = () => {
    const getLayout = makeGetLayout();
    const getComponentValidations = makeGetComponentValidationsSelector();
    const mapStateToProps = (state: IRuntimeState, props: IProvidedProps): IProps => ({
      language: state.language.language,
      textResources: state.formResources.languageResource.resources,
      componentValidations: getComponentValidations(state, props),
      layout: getLayout(state),
      ...props,
    });
    return mapStateToProps;
  };

  return connect(makeMapStateToProps)(FormComponentWithHandlers);
};
