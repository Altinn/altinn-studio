import React, { ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormContainer } from './FormContainer';
import type { FormContainer as IFormContainer } from '../types/FormContainer';
import type { FormComponent as IFormComponent } from '../types/FormComponent';
import { selectedLayoutSetSelector } from '../selectors/formLayoutSelectors';
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
  IFormLayouts,
  IInternalLayout,
} from '../types/global';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import { useSearchParams } from 'react-router-dom';
import { useFormLayoutSettingsQuery } from '../hooks/queries/useFormLayoutSettingsQuery';
import { PlusIcon } from '@navikt/aksel-icons';
import { PageAccordion } from './PageAccordion';
import { useAddLayoutMutation } from '../hooks/mutations/useAddLayoutMutation';
import cn from 'classnames';

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
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const receiptName = formLayoutSettingsQuery.data.receiptLayoutName;

  const layoutOrder = formLayoutSettingsQuery.data.pages.order;
  console.log('layoutOrder', layoutOrder);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsLayout = searchParams.get('layout');

  const { formId, form, handleDiscard, handleEdit, handleSave, debounceSave } = useFormContext();

  const { t } = useTranslation();

  const addLayoutMutation = useAddLayoutMutation(org, app, selectedLayoutSet);

  const [openAccordion, setOpenAccordion] = useState(searchParamsLayout);

  /**
   * Maps the IFormLayouts object to a list of FormLayouts
   *
   * TODO @David - Move this to utilrs maybe?
   * TODO @David - Find out if this needs to be sorted
   */
  const mapIFormLayoutsToFormLayouts = (iFormLayours: IFormLayouts): FormLayout[] => {
    return Object.entries(iFormLayours).map(([key, value]) => ({
      page: key,
      data: value,
    }));
  };

  const [formLayoutData, setFormLayoutData] = useState<FormLayout[]>(
    mapIFormLayoutsToFormLayouts(layouts),
  );
  console.log(
    'mappedFormLayoutData',
    formLayoutData.map((m) => m.page),
  );

  useEffect(() => {
    console.log('in usefectt');
    setOpenAccordion(searchParamsLayout);
    setFormLayoutData(mapIFormLayoutsToFormLayouts(layouts));
  }, [layouts, searchParamsLayout]);

  /**
   * Checks if the layout name provided is valid
   *
   * @param layoutName the name to check
   *
   * @returns boolean value for the validity
   */
  const isValidLayout = (layoutName: string): boolean => {
    const isExistingLayout = formLayoutData.map((el) => el.page).includes(layoutName);
    const isReceipt = formLayoutSettings?.receiptLayoutName === layoutName;
    return isExistingLayout || isReceipt;
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
        setOpenAccordion(pageName);
      } else {
        setSelectedLayoutInLocalStorage(instanceId, undefined);
        dispatch(FormLayoutActions.updateSelectedLayout(undefined));
        setSearchParams(undefined);
        setOpenAccordion('');
      }
    }
  };

  const handleAddPage = (isReceipt: boolean) => {
    if (isReceipt) {
      console.log('in add');
      addLayoutMutation.mutate({ layoutName: 'Kvittering', isReceiptPage: true });
      setSearchParams((prevParams) => ({ ...prevParams, layout: 'Kvittering' }));
      setOpenAccordion('Kvittering');
    } else {
      let newNum = 1;
      let newLayoutName = `${t('left_menu.page')}${layoutOrder.length + newNum}`;

      while (layoutOrder.indexOf(newLayoutName) > -1) {
        console.log('in while');
        newNum += 1;
        newLayoutName = `${t('left_menu.page')}${newNum}`;
      }

      addLayoutMutation.mutate({ layoutName: newLayoutName, isReceiptPage: false });
      setSearchParams((prevParams) => ({ ...prevParams, layout: newLayoutName }));
      setSelectedLayoutInLocalStorage(instanceId, newLayoutName);
      dispatch(FormLayoutActions.updateSelectedLayout(newLayoutName));
      setOpenAccordion(newLayoutName);
    }
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

  /**
   * Displays the pages as an ordered list
   */
  const displayPageAccordions = layoutOrder.map((pageName, i) => {
    const layout = formLayoutData.find((formLayout) => formLayout.page === pageName);

    // If the layout does not exist, return null
    if (layout === undefined) return null;

    // Display the accordion with the layout data
    const { order, containers, components } = layout.data;
    return (
      <PageAccordion
        pageName={layout.page}
        key={i}
        isOpen={layout.page === openAccordion}
        onClick={() => handleClickAccordion(layout.page)}
      >
        {layout.page === openAccordion &&
          renderContainer(BASE_CONTAINER_ID, true, order, containers, components)}
      </PageAccordion>
    );
  });

  const displayReceipt = () => {
    if (receiptName) {
      const receiptData = formLayoutData.find((d) => d.page === receiptName);
      if (receiptData === undefined) return null;

      const { order, containers, components } = receiptData.data || {};

      return (
        <PageAccordion
          pageName={receiptName}
          isOpen={receiptName === openAccordion}
          onClick={() => handleClickAccordion(receiptName)}
        >
          {renderContainer(BASE_CONTAINER_ID, true, order, containers, components)}
        </PageAccordion>
      );
    } else {
      return (
        <div className={classes.button}>
          <Button
            variant='quiet'
            onClick={() => handleAddPage(true)}
            className={classes.button}
            size='small'
          >
            {t('receipt.create')}
          </Button>
        </div>
      );
    }
  };

  return (
    <div className={className}>
      <div className={classes.accordionWrapper}>
        {displayPageAccordions}
        {displayReceipt()}
      </div>
      <div className={cn(classes.button, classes.addButton)}>
        <Button icon={<PlusIcon />} onClick={() => handleAddPage(false)} size='small'>
          {t('left_menu.pages_add')}
        </Button>
      </div>
    </div>
  );
};
