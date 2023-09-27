import React, { ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormContainer } from './FormContainer';
import type { FormContainer as IFormContainer } from '../types/FormContainer';
import type { FormComponent as IFormComponent } from '../types/FormComponent';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from '../selectors/formLayoutSelectors';
import { FormComponent } from '../components/FormComponent';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useFormContext } from './FormContext';
import { ConnectDragSource } from 'react-dnd';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { ComponentType } from 'app-shared/types/ComponentType';
import { Button } from '@digdir/design-system-react';
import {
  IFormDesignerComponents,
  IFormDesignerContainers,
  IFormLayoutOrder,
  IInternalLayout,
} from '../types/global';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import { useSearchParams } from 'react-router-dom';
import { useFormLayoutSettingsQuery } from '../hooks/queries/useFormLayoutSettingsQuery';
import { PlusIcon } from '@navikt/aksel-icons';
import { PageAccordion } from './PageAccordion';
import { useAddLayoutMutation } from '../hooks/mutations/useAddLayoutMutation';

// TODO @David - Move type to another place
export interface FormLayout {
  page: string;
  data: IInternalLayout;
}

// TODO @David - Move function to utils
const setSelectedLayoutInLocalStorage = (instanceId: string, layoutName: string) => {
  if (instanceId) {
    // Need to use InstanceId as storage key since apps uses it and it is needed to sync layout between preview and editor
    localStorage.setItem(instanceId, layoutName);
  }
};

export interface DesignViewProps {
  /**
   * Additional classnames to add to the component's wrapper
   */
  className?: string;
}

/**
 * @component
 *    TODO @David  - documentation
 *
 * @property {string}[className] - Additional classnames to add to the component's wrapper
 *
 * @returns {ReactNode} - The rendered component
 */
export const DesignView = ({ className }: DesignViewProps): ReactNode => {
  const dispatch = useDispatch();
  const { org, app } = useStudioUrlParams();
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
  const { data: layouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsLayout = searchParams.get('layout');

  const selectedLayoutName = useSelector(selectedLayoutNameSelector);
  console.log('selectedLayoutName', selectedLayoutName);

  const { formId, form, handleDiscard, handleEdit, handleSave, debounceSave } = useFormContext();

  const { t } = useTranslation();

  const addLayoutMutation = useAddLayoutMutation(org, app, selectedLayoutSet);

  /**
   * Maps the IFormLayouts object to a list of FormLayouts
   *
   * TODO @David - Move this to utilrs maybe?
   * TODO @David - Find out if this needs to be sorted
   */
  const mappedFormLayoutData: FormLayout[] = Object.entries(layouts).map(([key, value]) => ({
    page: key,
    data: value,
  }));

  /**
   * Checks if the layout name provided is valid
   *
   * @param layoutName the name to check
   *
   * @returns boolean value for the validity
   */
  const isValidLayout = (layoutName: string): boolean => {
    const isExistingLayout = mappedFormLayoutData.map((el) => el.page).includes(layoutName);
    const isReceipt = formLayoutSettings?.receiptLayoutName === layoutName;
    return isExistingLayout || isReceipt;
  };

  /**
   * Gets the status of if an accordion is open or not
   *
   * @param layoutName the layout displayed in the accordion
   *
   * @returns boolean valud for if it is open or not
   */
  const getAccordionOpenStatus = (layoutName: string): boolean => {
    // TODO @David - jeg har lagt på en del kommentarer her for å prøve debuge hva som skjer.
    // Det viser seg at begge disse to loges i consolen:
    // - layout and selected match on: Kvittering
    // - layout and search param match on: Side8
    // Det er rart at selected er satt til Kvittering når man legger til en ny en.

    layoutName === searchParamsLayout &&
      console.log('layout and search param match on: ', layoutName);
    layoutName === selectedLayoutName && console.log('layout and selected match on: ', layoutName);
    // Dersom vi kommer inn på siden første gang, og eksisterende selectedLayoutName er 'default', sett til
    // det som kommer fra params, dersom params er gyldig og matcher den som er sent inn til funksjonen.
    // Om de ikke er valid, return false.
    if (selectedLayoutName === 'default') {
      if (isValidLayout(searchParamsLayout) && isValidLayout(layoutName)) {
        return searchParamsLayout === layoutName;
      } else {
        return false;
      }
    }
    // Om den ikke er default, sjekk om layoutName som kommer inn matcher den som er lagret i
    // selectedLayoutName. om ikke, returner false.
    else {
      if (isValidLayout(selectedLayoutName) && isValidLayout(layoutName)) {
        return selectedLayoutName === layoutName;
      } else {
        return false;
      }
    }
  };

  /**
   * Handles the click of an accordion. It updates the URL and sets the
   * local storage for which page view that is open
   *
   * @param pageName the name of the accordion clicked
   */
  const handleClickAccordion = (pageName: string) => {
    if (isValidLayout(pageName)) {
      if (searchParamsLayout !== pageName) {
        setSelectedLayoutInLocalStorage(instanceId, pageName);
        dispatch(FormLayoutActions.updateSelectedLayout(pageName));
        setSearchParams((prevParams) => ({ ...prevParams, layout: pageName }));
      } else {
        setSelectedLayoutInLocalStorage(instanceId, undefined);
        dispatch(FormLayoutActions.updateSelectedLayout(undefined));
        setSearchParams(undefined);
      }
    }
  };

  // TODO @David
  // Det er et problem når man legger til en ny side dersom Kvittering eksisterer.
  // Problemet er at etter man har lagt til siden, så åpner kvitterings accordionen seg, isteden for
  // at accordionen som tilhører den nye siden åpner seg..
  // Dersom du refresher siden, så er riktig accoridon åpen, og kvittering lukket.
  // Mistenker at det kan ha noe med funksjonen "getAccordionOpenStatus()" å gjøre, eller at
  // selectedLayoutName blir satt et eller anent sted i koden, typ en useEffect eller noe.
  const handleAddPage = (isReceipt: boolean) => {
    const newNum = mappedFormLayoutData.filter((p) => p.page !== 'Kvittering').length + 1;
    const newLayoutName = isReceipt ? 'Kvittering' : t('left_menu.page') + newNum;
    console.log(newNum);

    addLayoutMutation.mutate({ layoutName: newLayoutName, isReceiptPage: isReceipt });
    setSelectedLayoutInLocalStorage(instanceId, newLayoutName);
    dispatch(FormLayoutActions.updateSelectedLayout(newLayoutName));
    setSearchParams((prevParams) => ({ ...prevParams, layout: newLayoutName }));
  };

  // TODO @David - Denne kan potensielt flyttes til separate filer.
  // Det er i komponentene her at stylingen må skje for å matche Figma.
  const renderContainer = (
    id: string,
    isBaseContainer: boolean,
    order: IFormLayoutOrder,
    containers: IFormDesignerContainers,
    components: IFormDesignerComponents,
    dragHandleRef?: ConnectDragSource,
  ) => {
    if (!id) return null;

    const items = order[id];

    return (
      <FormContainer
        container={formId === id ? (form as IFormContainer) : containers[id]}
        dragHandleRef={dragHandleRef}
        handleDiscard={handleDiscard}
        handleEdit={handleEdit}
        handleSave={handleSave}
        id={id}
        isBaseContainer={isBaseContainer}
        isEditMode={formId === id}
      >
        <DragAndDrop.List<ComponentType>>
          {items?.length ? (
            items.map((itemId: string, itemIndex: number) => (
              <DragAndDrop.ListItem<ComponentType>
                key={itemId}
                index={itemIndex}
                itemId={itemId}
                renderItem={(itemDragHandleRef) => {
                  const component = components[itemId];
                  if (component) {
                    return (
                      <FormComponent
                        id={itemId}
                        isEditMode={formId === itemId}
                        component={
                          formId === itemId ? (form as IFormComponent) : components[itemId]
                        }
                        handleEdit={handleEdit}
                        handleSave={handleSave}
                        debounceSave={debounceSave}
                        handleDiscard={handleDiscard}
                        dragHandleRef={itemDragHandleRef}
                      />
                    );
                  }
                  return (
                    containers[itemId] &&
                    renderContainer(itemId, false, order, containers, components, itemDragHandleRef)
                  );
                }}
              />
            ))
          ) : (
            <p className={classes.emptyContainerText}>{t('ux_editor.container_empty')}</p>
          )}
        </DragAndDrop.List>
      </FormContainer>
    );
  };

  const displayPageAccordions = mappedFormLayoutData.map((layout, i) => {
    const { order, containers, components } = layout.data || {};
    return (
      <PageAccordion
        pageName={layout.page}
        key={i} /* TODO @David - Fikse key */
        isOpen={getAccordionOpenStatus(layout.page)}
        onClick={() => handleClickAccordion(layout.page)}
      >
        {renderContainer(BASE_CONTAINER_ID, true, order, containers, components)}
      </PageAccordion>
    );
  });

  return (
    <div className={className}>
      {displayPageAccordions}
      <div className={classes.addButton}>
        <Button icon={<PlusIcon />} onClick={() => handleAddPage(false)} size='small'>
          {t('left_menu.pages_add')}
        </Button>
      </div>
      {mappedFormLayoutData.filter((p) => p.page === 'Kvittering').length === 0 && (
        <div className={classes.receiptButton}>
          <Button
            variant='quiet'
            onClick={() => handleAddPage(true)}
            className={classes.button}
            size='small'
          >
            {t('receipt.create')}
          </Button>
        </div>
      )}
    </div>
  );
};
