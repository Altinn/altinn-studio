import { Grid, Typography } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { IRuntimeState } from '../../../types';
import { IComponentValidations } from '../../../types/global';
import { renderValidationMessagesForComponent } from '../../../utils/render';
import { IDataModelBindings, ILayout, ILayoutComponent, ITextResourceBindings } from '../layout';
import Label from '../components/Label';
import Description from '../components/Description';
import HelpTextPopover from '../components/HelpTextPopover';

export interface IProvidedProps  {
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

export function formComponentWithHandlers(WrappedComponent: React.ComponentType<any>): any {
  return function FormComponentWithHandlers(props: IProvidedProps) {
    const {
      id,
      ...passThroughProps
    } = props;
    const textResourceBindings = props.textResourceBindings;

    const [helpIconRef, setHelpIconRef] = React.useState(!!textResourceBindings.help ? React.createRef() : null);
    const [openPopover, setOpenPopover] = React.useState(false);

    const language: any = useSelector((state: IRuntimeState) => state.language.language);
    const textResources: any = useSelector((state: IRuntimeState) => state.textResources.resources);
    const componentValidations = useSelector((state: IRuntimeState) => state.formValidations.validations[id]);
    const component: ILayoutComponent = useSelector((state: IRuntimeState) => state.formLayout.layout[id] as ILayoutComponent);

    const getTextResource = (resourceKey: string): string => {
      const textResource = textResources.find((resource) => resource.id === resourceKey);
      return textResource ? textResource.value : resourceKey;
    }

    const hasValidationMessages = () => {
      if (!componentValidations) {
        return false;
      }
      let hasMessages = false;
      Object.keys(componentValidations).forEach((key: string) => {
        if (componentValidations[key].errors.length > 0
          || componentValidations[key].warnings.length > 0) {
          hasMessages = true;
          return;
        }
      });

      return hasMessages;
    }

    const isSimpleComponent = (): boolean => {
      if (!component || !component.dataModelBindings) {
        return false;
      }
      const simpleBinding = component.dataModelBindings.simpleBinding;
      const type = component.type;
      return simpleBinding && type !== 'FileUpload';
    }

    const getAdressComponentValidations = () => {
      if (props.type === 'AddressComponent') {
        return componentValidations;
      } else {
        return null;
      }
    }

    const toggleClickPopover = (event: React.MouseEvent): void => {
      event.stopPropagation();
      event.preventDefault();
      setOpenPopover(!openPopover);
    }
  
    const toggleKeypressPopover = (event: React.KeyboardEvent): void => {
      if ((event.key === ' ' || event.key === 'Enter') && !openPopover) {
        setOpenPopover(true);
      }
    }
  
    const closePopover = () => {
      setOpenPopover(false);
    }

    const addressComponentValidations = getAdressComponentValidations();
    if (addressComponentValidations !== null) {
      passThroughProps.addressComponentValidations = addressComponentValidations;
    }

    const helptText = textResourceBindings.help ? getTextResource(textResourceBindings.help): null;
    const labelText = textResourceBindings.title ? getTextResource(textResourceBindings.title) : null;

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
              <Grid
                container={true}
                item={true}
                alignItems={'center'}
              >
                <Label
                  helpIconRef={helpIconRef}
                  language={language}
                  labelText={labelText}
                  helpText={helptText}
                  openPopover={openPopover}
                  toggleClickPopover={toggleClickPopover}
                  toggleKeypressPopover={toggleKeypressPopover}
                  {...props}
                />
              </Grid>
              <Grid item={true}>
                <Description descriptionTextKey={textResourceBindings.description} />
                <Typography variant='srOnly'>
                  {getTextResource(textResourceBindings.help)}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <WrappedComponent
          id={id}
          text={getTextResource(textResourceBindings.title)}
          handleDataChange={props.handleDataUpdate}
          {...passThroughProps}
        />
        {isSimpleComponent() && hasValidationMessages() &&
          renderValidationMessagesForComponent(componentValidations.simpleBinding, id)
        }
      </Grid>
      <HelpTextPopover
        helpIconRef={helpIconRef}
        openPopover={openPopover}
        language={language}
        helpText={helptText}
        closePopover={closePopover}
      />
      </>
    )
  } 
};
