import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Accordion, Button } from '@digdir/design-system-react';
import { IFormLayouts } from '../../types/global';
import type { FormLayout } from '../../types/FormLayout';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import { useSearchParams } from 'react-router-dom';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { PlusIcon } from '@navikt/aksel-icons';
import { useAddLayoutMutation } from '../../hooks/mutations/useAddLayoutMutation';
import cn from 'classnames';
import { setSelectedLayoutInLocalStorage } from '../../utils/localStorageUtils';
import { PageAccordion } from './PageAccordion';
import { RenderedFormContainer } from './RenderedFormContainer';
import { ReceiptContent } from './ReceiptContent';
import { useAppContext } from '../../hooks/useAppContext';

/**
 * @component
 *    Displays the column containing accordions with components for each page
 *
 * @returns {ReactNode} - The rendered component
 */
export const DesignView = (): ReactNode => {
  const dispatch = useDispatch();
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const addLayoutMutation = useAddLayoutMutation(org, app, selectedLayoutSet);
  const { data: layouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const receiptName = formLayoutSettings?.receiptLayoutName;
  const layoutOrder = formLayoutSettings?.pages.order;

  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsLayout = searchParams.get('layout');
  const [openAccordion, setOpenAccordion] = useState(searchParamsLayout);

  const { t } = useTranslation();

  /**
   * Maps the IFormLayouts object to a list of FormLayouts
   */
  const mapIFormLayoutsToFormLayouts = useCallback((formLayouts: IFormLayouts): FormLayout[] => {
    if (!layouts) return [];
    return Object.entries(formLayouts).map(([key, value]) => ({
      page: key,
      data: value,
    }));
  }, []);

  const [formLayoutData, setFormLayoutData] = useState<FormLayout[]>(mapIFormLayoutsToFormLayouts(layouts));

  useEffect(() => {
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

  /**
   * Handles the click of add page. It adds either a receipt page or a
   * normal page based on the isReceipt variable.
   */
  const handleAddPage = (isReceipt: boolean) => {
    if (isReceipt) {
      addLayoutMutation.mutate({ layoutName: 'Kvittering', isReceiptPage: true });
      setSearchParams((prevParams) => ({ ...prevParams, layout: 'Kvittering' }));
      setOpenAccordion('Kvittering');
    } else {
      let newNum = 1;
      let newLayoutName = `${t('ux_editor.page')}${layoutOrder.length + newNum}`;

      while (layoutOrder.indexOf(newLayoutName) > -1) {
        newNum += 1;
        newLayoutName = `${t('ux_editor.page')}${newNum}`;
      }

      addLayoutMutation.mutate({ layoutName: newLayoutName, isReceiptPage: false });
      setSearchParams((prevParams) => ({ ...prevParams, layout: newLayoutName }));
      setSelectedLayoutInLocalStorage(instanceId, newLayoutName);
      dispatch(FormLayoutActions.updateSelectedLayout(newLayoutName));
      setOpenAccordion(newLayoutName);
    }
  };

  /**
   * Displays the pages as an ordered list
   */
  const displayPageAccordions = layoutOrder.map((pageName, i) => {
    const layout = formLayoutData?.find((formLayout) => formLayout.page === pageName);

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
        {layout.page === openAccordion && (
          <RenderedFormContainer
            containerId={BASE_CONTAINER_ID}
            formLayoutOrder={order}
            formDesignerContainers={containers}
            formDesignerComponents={components}
          />
        )}
      </PageAccordion>
    );
  });

  return (
    <div className={classes.root}>
      <div>
        <div className={classes.wrapper}>
          <div className={classes.accordionWrapper}>
            <Accordion color='neutral' className={classes.accordion}>
              {displayPageAccordions}
            </Accordion>
          </div>
        </div>
        <ReceiptContent
          receiptName={receiptName}
          selectedAccordion={openAccordion}
          formLayoutData={formLayoutData}
          onClickAccordion={() => handleClickAccordion(receiptName)}
          onClickAddPage={() => handleAddPage(true)}
        />
      </div>
      <div className={cn(classes.button, classes.addButton)}>
        <Button icon={<PlusIcon />} onClick={() => handleAddPage(false)} size='small'>
          {t('ux_editor.pages_add')}
        </Button>
      </div>
    </div>
  );
};
