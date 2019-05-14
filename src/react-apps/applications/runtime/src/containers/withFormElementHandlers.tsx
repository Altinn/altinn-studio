import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { IFormData } from '../features/form/data/reducer';
import { IRuntimeState } from '../types';

export interface IProvidedProps {
  id: string;
  handleDataUpdate: (data: any) => void;
  dataModelBindings: any;
  textResourceBindings: any;
  required: boolean;
  type: string;
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
        this.props.type === 'AddressComponent') {
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
        </>
      );
    }
  }
  const makeMapStateToProps = () => {
    const mapStateToProps = (state: IRuntimeState, props: IProvidedProps): IProps => {
      return {
        language: state.language.language,
        textResources: state.formResources.languageResource.resources,
        ...props,
      };
    };
    return mapStateToProps;
  };

  return connect(makeMapStateToProps)(FormComponentWithHandlers);
};
