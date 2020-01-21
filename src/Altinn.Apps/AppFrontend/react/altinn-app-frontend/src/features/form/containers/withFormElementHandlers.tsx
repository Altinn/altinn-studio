import { Grid, Typography } from '@material-ui/core';
import {
  createMuiTheme,
  createStyles,
  WithStyles,
  withStyles,
} from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import {AltinnPopover} from 'altinn-shared/components';
import {AltinnAppTheme} from 'altinn-shared/theme';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { makeGetLayout } from '../../../selectors/getLayoutData';
import { makeGetComponentValidationsSelector } from '../../../selectors/getValidations';
import { IRuntimeState } from '../../../types';
import { IComponentValidations } from '../../../types/global';
import { renderValidationMessagesForComponent } from '../../../utils/render';
import { IDataModelBindings, ILayout, ILayoutComponent, ITextResourceBindings } from '../layout';

export interface IProvidedProps extends WithStyles<typeof styles> {
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
  openPopover: boolean;
}

const theme = createMuiTheme(AltinnAppTheme);

const styles = createStyles({
  helpTextIcon: {
    'width': '44px',
    'height': '44px',
    'paddingTop': '2rem',
    'fontSize': '3rem',
    'color': theme.altinnPalette.primary.blue,
    '&:hover': {
      color: theme.altinnPalette.primary.blueDarker,
    },
  },
  helpTextPopoverPaper: {
    backgroundColor: theme.altinnPalette.primary.yellowLight,
    height: 'auto',
    width: 'auto',
  },
  helpTextPopoverText: {
    position: 'relative',
    width: '100%',
  },
});

export const formComponentWithHandlers = (WrappedComponent: React.ComponentType<any>): any => {
  class FormComponentWithHandlers extends React.Component<IProps & WithStyles<typeof styles>, IState> {
    constructor(props: IProps) {
      super(props);

      this.state = {
        helpIconRef: !!props.textResourceBindings.help ? React.createRef() : null,
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
          <>
            <Grid item={true}>
              <label className='a-form-label title-label' htmlFor={this.props.id}>
                {label}
                {this.props.required ? null :
                  <span className='label-optional'>
                    ({getLanguageFromKey('general.optional', this.props.language)})
                  </span>
                }
              </label>
            </Grid>
            <Grid item={true}>
              {this.renderHelpText()}
            </Grid>
          </>
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
        const { classes } = this.props;
        const { helpIconRef, openPopover } = this.state;
        return (
          <span
            tabIndex={0}
            onClick={this.toggleClickPopover}
            onKeyUp={this.toggleKeypressPopover}
            ref={helpIconRef}
            role='button'
            aria-label={getLanguageFromKey('popover.popover_button_helptext', this.props.language)}
            aria-hidden={false}
          >
            <i
              className={`${classes.helpTextIcon} ${openPopover ? 'ai ai-circle-minus' : 'ai ai-circle-plus'}`}
            />
          </span>
        );
      }
      return null;
    }

    public toggleClickPopover = (event: React.MouseEvent): void => {
      event.stopPropagation();
      event.preventDefault();
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
    }

    public closePopover = () => {
      this.setState({
        openPopover: false,
      });
    }

    public handleDataUpdate = (data: any) => this.props.handleDataUpdate(data);

    public getTextResource = (resourceKey: string): string => {
      const textResource = this.props.textResources.find((resource) => resource.id === resourceKey);
      return textResource ? textResource.value : resourceKey;
    }

    public render(): JSX.Element {
      const { helpIconRef, openPopover } = this.state;
      const { id, classes, ...passThroughProps } = this.props;
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
                  <Grid container={true} item={true} alignItems='center'>
                    {this.renderLabel()}
                  </Grid>
                  <Grid item={true}>
                    {this.renderDescription()}
                    <Typography variant='srOnly'>
                      {this.getTextResource(this.props.textResourceBindings.help)}
                    </Typography>
                  </Grid>
                </Grid>
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
          {!!helpIconRef &&
            <AltinnPopover
              ariaLabel={`${getLanguageFromKey('popover.popover_open', this.props.language)}.
                          ${this.getTextResource(this.props.textResourceBindings.help)}`}
              anchorOrigin={{
                horizontal: 'right',
                vertical: 'top',
              }}
              transformOrigin={{
                horizontal: 'right',
                vertical: 'bottom',
              }}
              backgroundColor={theme.altinnPalette.primary.yellowLight.toString()}
              anchorEl={openPopover ? helpIconRef.current : null}
              handleClose={this.closePopover}
              paperProps={{
                classes: {
                  root: classes.helpTextPopoverPaper,
                },
              }}
            >
              <Typography
                className={classes.helpTextPopoverText}
              >
                {this.getTextResource(this.props.textResourceBindings.help)}
              </Typography>
            </AltinnPopover>
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

  return connect(makeMapStateToProps)(withStyles(styles)(FormComponentWithHandlers));
};
