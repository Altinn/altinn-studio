import { Grid, Popper, Typography } from '@material-ui/core';
import { styled } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import theme from '../../../../../shared/src/theme/altinnAppTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { makeGetLayout } from '../../../selectors/getLayoutData';
import { makeGetComponentValidationsSelector } from '../../../selectors/getValidations';
import { IRuntimeState } from '../../../types';
import { IComponentValidations } from '../../../types/global';
import { renderValidationMessagesForComponent } from '../../../utils/render';
import { IDataModelBindings, ILayout, ILayoutComponent, ITextResourceBindings } from '../layout';

const HelpTextPopoverWrapper = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  width: '20px',
  height: '24px',
});

const HelpTextPopoverIcon = styled('i')({
  'paddingTop': '1.2rem',
  'fontSize': '2rem',
  'color': theme.altinnPalette.primary.blue,
  '&:hover': {
    color: theme.altinnPalette.primary.blueDarker,
  },
});

const PopperWrapper = styled('div')({
  padding: '1.2rem',
  backgroundColor: theme.altinnPalette.primary.yellowLight,
  border: `1px solid ${theme.altinnPalette.primary.black}`,
});

const PopperWrapperArrow = styled('div')({
  backgroundColor: theme.altinnPalette.primary.yellowLight,
  height: '20px',
  width: '20px',
  transform: 'rotate(45deg)',
  marginTop: '-1rem',
  borderBottom: `1px solid ${theme.altinnPalette.primary.black}`,
  borderRight: `1px solid ${theme.altinnPalette.primary.black}`,
});

export interface IProvidedProps {
  id: string;
  handleDataUpdate: (data: any) => void;
  dataModelBindings: IDataModelBindings;
  componentValidations: IComponentValidations;
  textResourceBindings: ITextResourceBindings;
  required: boolean;
  type: string;
  layout: ILayout;
  addressComponentValidations?: any;
}

export interface IProps extends IProvidedProps {
  language: any;
  textResources: any[];
}

export interface IState {
  helpIconRef: React.RefObject<HTMLDivElement>;
  popperArrowRef: React.RefObject<HTMLDivElement>;
  openPopover: boolean;
}

export const formComponentWithHandlers = (WrappedComponent: React.ComponentType<any>): React.ComponentClass<any> => {
  class FormComponentWithHandlers extends React.Component<IProps, IState> {
    constructor(props: IProps) {
      super(props);

      this.state = {
        helpIconRef: !!props.textResourceBindings.help ? React.createRef() : null,
        popperArrowRef: React.createRef(),
        openPopover: false,
      };
    }

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

    public renderHelpText = (): JSX.Element => {
      if (!!this.props.textResourceBindings.help) {
        const { helpIconRef } = this.state;
        return (
          <HelpTextPopoverWrapper
            tabIndex={0}
            onClick={this.toggleClickPopover}
            onKeyUp={this.toggleKeypressPopover}
            onBlur={this.toggleBlurPopover}
            ref={helpIconRef}
          >
            <HelpTextPopoverIcon
              className={
                this.state.openPopover ?
                'ai ai-circle-minus' :
                'ai ai-circle-plus'
              }
            />
          </HelpTextPopoverWrapper>
        );
      }
      return null;
    }

    public toggleClickPopover = (): void => {
      this.setState((prev: IState) => ({
        openPopover: !prev.openPopover,
      }));
    }

    public toggleKeypressPopover = (event: React.KeyboardEvent): void => {
      if ((event.key === ' ' || event.key === 'Enter') && !this.state.openPopover) {
        this.setState({
          openPopover: true,
        });
      }
      if (event.key === 'Escape' && this.state.openPopover) {
        this.setState({
          openPopover: false,
        });
      }
    }

    public toggleBlurPopover = () => {
      if (this.state.openPopover) {
        this.setState({
          openPopover: false,
        });
      }
    }

    public handleDataUpdate = (data: any) => this.props.handleDataUpdate(data);

    public getTextResource = (resourceKey: string): string => {
      const textResource = this.props.textResources.find((resource) => resource.id === resourceKey);
      return textResource ? textResource.value : resourceKey;
    }

    public render(): JSX.Element {
      const { helpIconRef, popperArrowRef, openPopover } = this.state;
      const { id, ...passThroughProps } = this.props;
      const text = this.getTextResource(this.props.textResourceBindings.title);
      const validations = this.getAdressComponentValidations();
      if (validations !== null) {
        passThroughProps.addressComponentValidations = validations;
      }

      return (
        <>
          <Grid
            container={true}
            direction={'column'}
          >
            <Grid
              container={true}
              direction={'row'}
              spacing={2}
            >
              <Grid item={true}>
                <Grid
                  container={true}
                  direction={'column'}
                >
                  {this.renderLabel()}
                  {this.renderDescription()}
                </Grid>
              </Grid>
              <Grid item={true}>
                {this.renderHelpText()}
              </Grid>

            </Grid>
            <WrappedComponent
              id={id}
              text={text}
              handleDataChange={this.handleDataUpdate}
              {...passThroughProps}
            />
            {this.errorMessage()}
          </Grid>
          {!!helpIconRef ?
            <Popper
              anchorEl={helpIconRef.current}
              open={openPopover}
              placement={'top'}
              modifiers={{
                flip: {
                  enabled: true,
                },
                preventOverflow: {
                  enabled: true,
                  boundariesElement: 'scrollParent',
                },
                arrow: {
                  enabled: true,
                  element: popperArrowRef.current,
                },
              }}
            >
              <PopperWrapperArrow ref={popperArrowRef}/>
                <PopperWrapper>
                  <Typography>
                    {this.getTextResource(this.props.textResourceBindings.help)}
                  </Typography>
                </PopperWrapper>
            </Popper>
            : null
          }
        </>
      );
    }

    public getAdressComponentValidations = () => {
      if (this.props.type === 'AddressComponent') {
        return this.props.componentValidations;
      } else {
        return null;
      }
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
      return simpleBinding && type !== 'FileUpload';
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
      textResources: state.textResources.resources,
      componentValidations: getComponentValidations(state, props),
      layout: getLayout(state),
      ...props,
    });
    return mapStateToProps;
  };

  return connect(makeMapStateToProps)(FormComponentWithHandlers);
};
