import React, { useCallback } from 'react';
import { createStyles, withStyles } from '@mui/styles';
import { connect, useDispatch } from 'react-redux';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import { EditContainer } from '../containers/EditContainer';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import type { FormComponentType, IAppState, IDataModelFieldElement } from '../types/global';

const styles = createStyles({});

/**
 * Properties defined for input for wrapper
 */
export interface IProvidedProps {
  id: string;
  activeList: any[];
  classes: any;
  firstInActiveList: boolean;
  lastInActiveList: boolean;
  sendListToParent: any;
  singleSelected: boolean;
  partOfGroup?: boolean;
}

/**
 * Properties for the component itself. mapStateToProps convert to this from
 */
export interface IFormElementProps extends IProvidedProps {
  component: FormComponentType;
  dataModelElement: IDataModelFieldElement;
  dataModel: IDataModelFieldElement[];
  validationErrors: any[];
  textResources: any[];
  order: any[];
}

const FormComponent = (props: IFormElementProps) => {
  const [wrapperRef, setWrapperRef] = React.useState(null);
  const dispatch = useDispatch();
  const { sendListToParent, activeList } = props;
  const handleActiveListChange = useCallback(
    (obj: any) => {
      if (Object.keys(obj).length === 0 && obj.constructor === Object) {
        dispatch(FormLayoutActions.deleteActiveList());
      } else {
        dispatch(
          FormLayoutActions.updateActiveList({
            listItem: obj,
            containerList: activeList,
          })
        );
      }
      sendListToParent(activeList);
    },
    [dispatch, sendListToParent, activeList]
  );

  /*
   * Handle all types of clicks.
   * Tracks if the click is outside of the formComponent
   */
  const handleClick = useCallback(
    (e: any) => {
      const serviceLogicMenu = document.getElementById('serviceLogicMenu');
      if (serviceLogicMenu && !serviceLogicMenu.contains(e.target)) {
        const key: any = Object.keys(props.order)[0];
        const order = props.order[key].indexOf(props.id);

        if (wrapperRef && !wrapperRef.contains(e.target) && order === 0) {
          handleActiveListChange({});
        }
      }
    },
    [handleActiveListChange, props.id, props.order, wrapperRef]
  );

  React.useEffect(() => {
    window.addEventListener('mousedown', handleClick);

    return () => {
      window.removeEventListener('mousedown', handleClick);
    };
  }, [handleClick]);

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
    if (
      props.component.type === 'Header' ||
      props.component.type === 'Paragraph' ||
      props.component.type === 'Submit' ||
      props.component.type === 'ThirdParty' ||
      props.component.type === 'AddressComponent'
    ) {
      return null;
    }
    if (!props.component.textResourceBindings) {
      return null;
    }
    if (props.component.textResourceBindings.title) {
      const label: string = getTextResource(props.component.textResourceBindings.title);
      return (
        <label className='a-form-label title-label' htmlFor={props.id}>
          {label}
          {props.component.required ? null : (
            // TODO: Get text key from common texts for all services.
            <span className='label-optional'>{getTextResource('(Valgfri)')}</span>
          )}
        </label>
      );
    }

    return null;
  };

  /**
   * Method that allows user to set focus to elements in the compoenent
   * instead of opening the edit modal on click.
   */
  const disableEditOnClickForAddedComponent = (e: any) => {
    e.stopPropagation();
  };

  return (
    <div ref={getWrapperRef}>
      <EditContainer
        component={props.component}
        id={props.id}
        firstInActiveList={props.firstInActiveList}
        lastInActiveList={props.lastInActiveList}
        sendItemToParent={handleActiveListChange}
        singleSelected={props.singleSelected}
        partOfGroup={props.partOfGroup}
      >
        <button className={'divider'} onClick={disableEditOnClickForAddedComponent}>
          {renderLabel()}
        </button>
      </EditContainer>
    </div>
  );
};

const makeMapStateToProps = () => {
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  return (state: IAppState, props: IProvidedProps): IFormElementProps => ({
    activeList: props.activeList,
    id: props.id,
    firstInActiveList: props.firstInActiveList,
    lastInActiveList: props.lastInActiveList,
    classes: props.classes,
    sendListToParent: props.sendListToParent,
    singleSelected: props.singleSelected,
    component:
      state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.components[
        props.id
      ],
    order: GetLayoutOrderSelector(state),
    dataModelElement: state.appData.dataModel.model.find(
      (element) =>
        element.dataBindingName ===
        state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.components[
          props.id
        ].dataModelBindings?.simpleBinding
    ),
    validationErrors: null,
    textResources: state.appData.textResources.resources,
    dataModel: state.appData.dataModel.model,
  });
};

/**
 * Wrapper made available for other compoments
 */
export const FormComponentWrapper = withStyles(styles, { withTheme: true })(
  connect(makeMapStateToProps)(FormComponent)
);
