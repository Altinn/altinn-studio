import {
  createStyles, withStyles,
} from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { EditContainer } from '../containers/EditContainer';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';

const styles = createStyles({

});

/**
 * Properties defined for input for wrapper
 */
export interface IProvidedProps {
  id: string;
  formData: any;
  activeList: any[];
  handleDataUpdate: (id: string, dataModelElement: any, value: any) => void;
  classes: any;
  firstInActiveList: boolean;
  lastInActiveList: boolean;
  sendListToParent: any;
  singleSelected: boolean;
}

/**
 * Properties for the component itself. mapStateToProps convert to this from
 */
export interface IFormElementProps extends IProvidedProps {
  component: FormComponentType;
  designMode: boolean;
  connections: any;
  externalApi: any;
  dataModelElement: IDataModelFieldElement;
  dataModel: IDataModelFieldElement[];
  validationErrors: any[];
  textResources: any[];
  thirdPartyComponents: any;
  order: any[];
}

/**
 * The component state
 */
export interface IFormElementState {
  component: FormComponentType;
  activeList: any[];
  wrapperRef: any;
}

/**
 * The component constructur
 */

const FormComponent = (props: IFormElementProps) => {
  const [wrapperRef, setWrapperRef] = React.useState(null);

  React.useEffect(() => {
    window.addEventListener('mousedown', handleClick);

    return () => {
      window.removeEventListener('mousedown', handleClick);
    };
  }, []);

  /*
  * Handle all types of clicks.
  * Tracks if the click is outside of the formComponent
  */
  const handleClick = (e: any) => {
    const serviceLogicMenu = document.getElementById('serviceLogicMenu');
    if (serviceLogicMenu) {
      if (!serviceLogicMenu.contains(e.target)) {
        const key: any = Object.keys(props.order)[0];
        const order = props.order[key].indexOf(props.id);

        if (wrapperRef && !wrapperRef.contains(event.target) &&
          order === 0) {
          handleActiveListChange({});
        }
      }
    }
  };

  const getWrapperRef = (node: any) => {
    if (node) {
      setWrapperRef(node.parentElement.parentElement);
    }
  };

  /**
   * Return a given textresource from all textresources avaiable
   */
  const getTextResource = (resourceKey: string): string => {
    const textResource = props.textResources.find((resource) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  };

  /**
   * Render label
   */
  const renderLabel = (): JSX.Element => {
    if (props.component.type === 'Header' ||
      props.component.type === 'Paragraph' ||
      props.component.type === 'Submit' ||
      props.component.type === 'ThirdParty' ||
      props.component.type === 'AddressComponent') {
      return null;
    }
    if (!props.component.textResourceBindings) {
      return null;
    }
    if (props.component.textResourceBindings.title) {
      const label: string =
        props.designMode ?
          props.component.textResourceBindings.title :
          getTextResource(props.component.textResourceBindings.title);
      return (
        <label className='a-form-label title-label' htmlFor={props.id}>
          {label}
          {props.component.required ? null :
            // TODO: Get text key from common texts for all services.
            <span className='label-optional'>{getTextResource('(Valgfri)')}</span>
          }
        </label>
      );
    }

    return null;
  };

  const handleActiveListChange = (obj: any) => {
    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
      FormDesignerActionDispatchers.deleteActiveListAction();
    } else {
      FormDesignerActionDispatchers.updateActiveList(obj, props.activeList);
    }
    props.sendListToParent(props.activeList);
  };

  /**
   * Method that allows user to set focus to elements in the compoenent
   * instead of opening the edit modal on click.
   */
  const disableEditOnClickForAddedComponent = (e: any) => {
    e.stopPropagation();
  };

  /**
   * The React Render method. This is run when this component is included in another component.
   * It is either called from FormFiller or FormDesigner.
   */
  return (
    <div ref={getWrapperRef}>
      <EditContainer
        component={props.component}
        id={props.id}
        firstInActiveList={props.firstInActiveList}
        lastInActiveList={props.lastInActiveList}
        sendItemToParent={handleActiveListChange}
        singleSelected={props.singleSelected}
      >
        <div onClick={disableEditOnClickForAddedComponent}>
          {renderLabel()}
        </div>
      </EditContainer>
    </div>
  );
};

/**
 * Map values from Provided props and store to FormElementProps
 * @param state the state
 * @param props the input props give as input from formFiller component
 */
const makeMapStateToProps = () => {
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const mapStateToProps = (state: IAppState, props: IProvidedProps): IFormElementProps => ({
    activeList: props.activeList,
    id: props.id,
    firstInActiveList: props.firstInActiveList,
    lastInActiveList: props.lastInActiveList,
    formData: props.formData,
    classes: props.classes,
    handleDataUpdate: props.handleDataUpdate,
    sendListToParent: props.sendListToParent,
    singleSelected: props.singleSelected,
    component: state.formDesigner.layout.components[props.id],
    order: GetLayoutOrderSelector(state),
    designMode: state.appData.appConfig.designMode,
    dataModelElement: state.appData.dataModel.model.find(
      (element) =>
        element.dataBindingName ===
        state.formDesigner.layout.components[props.id].dataModelBindings.simpleBinding),
    connections: state.serviceConfigurations.APIs.connections,
    externalApi: state.serviceConfigurations.APIs.externalApisById,
    validationErrors:
      Object.keys(state.formFiller.validationErrors).length > 0
        ? state.formFiller.validationErrors[props.id]
        : null,
    textResources: state.appData.textResources.resources,
    thirdPartyComponents: state.thirdPartyComponents.components,
    dataModel: state.appData.dataModel.model,
  });
  return mapStateToProps;
};

/**
 * Wrapper made available for other compoments
 */
export const FormComponentWrapper =
  withStyles(styles, { withTheme: true })(connect(makeMapStateToProps)(FormComponent));
