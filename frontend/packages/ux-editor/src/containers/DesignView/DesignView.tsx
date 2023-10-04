import React, { ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectedLayoutSetSelector } from '../../selectors/formLayoutSelectors';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Button } from '@digdir/design-system-react';
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

/**
 * @component
 *    Displays the column containing accordions with componnets for each page
 *
 * @returns {ReactNode} - The rendered component
 */
export const DesignView = (): ReactNode => {
  const dispatch = useDispatch();
  const { org, app } = useStudioUrlParams();
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
  const { data: layouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);

  const { data: instanceId } = useInstanceIdQuery(org, app);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const receiptName = formLayoutSettingsQuery.data.receiptLayoutName;

  const layoutOrder = formLayoutSettingsQuery.data.pages.order;

  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsLayout = searchParams.get('layout');

  const { t } = useTranslation();

  const addLayoutMutation = useAddLayoutMutation(org, app, selectedLayoutSet);

  const [openAccordion, setOpenAccordion] = useState(searchParamsLayout);

  /**
   * Maps the IFormLayouts object to a list of FormLayouts
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
        {displayPageAccordions}
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
