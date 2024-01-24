import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Accordion } from '@digdir/design-system-react';
import type { IFormLayouts } from '../../types/global';
import type { FormLayoutPage } from '../../types/FormLayoutPage';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import { useSearchParams } from 'react-router-dom';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { PlusIcon } from '@navikt/aksel-icons';
import { useAddLayoutMutation } from '../../hooks/mutations/useAddLayoutMutation';
import { setSelectedLayoutInLocalStorage } from '../../utils/localStorageUtils';
import { PageAccordion } from './PageAccordion';
import { ReceiptContent } from './ReceiptContent';
import { useAppContext } from '../../hooks/useAppContext';
import { FormLayout } from './FormLayout';
import { StudioButton } from '@studio/components';

/**
 * Maps the IFormLayouts object to a list of FormLayouts
 */
const mapFormLayoutsToFormLayoutPages = (formLayouts: IFormLayouts): FormLayoutPage[] => {
  return Object.entries(formLayouts).map(([key, value]) => ({
    page: key,
    data: value,
  }));
};

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
  const { mutate: addLayoutMutation, isPending } = useAddLayoutMutation(
    org,
    app,
    selectedLayoutSet,
  );
  const { data: layouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const receiptName = formLayoutSettings?.receiptLayoutName;
  const layoutOrder = formLayoutSettings?.pages.order;

  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsLayout = searchParams.get('layout');
  const [openAccordion, setOpenAccordion] = useState(searchParamsLayout);

  const { t } = useTranslation();

  useEffect(() => {
    setOpenAccordion(searchParamsLayout);
  }, [searchParamsLayout]);

  const formLayoutData = mapFormLayoutsToFormLayoutPages(layouts);

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
      addLayoutMutation({ layoutName: 'Kvittering', isReceiptPage: true });
      setSearchParams((prevParams) => ({ ...prevParams, layout: 'Kvittering' }));
      setOpenAccordion('Kvittering');
    } else {
      if (!isPending) {
        let newNum = 1;
        let newLayoutName = `${t('ux_editor.page')}${layoutOrder.length + newNum}`;

        while (layoutOrder.indexOf(newLayoutName) > -1) {
          newNum += 1;
          newLayoutName = `${t('ux_editor.page')}${newNum}`;
        }

        addLayoutMutation({ layoutName: newLayoutName, isReceiptPage: false });
        setSearchParams((prevParams) => ({ ...prevParams, layout: newLayoutName }));
        setSelectedLayoutInLocalStorage(instanceId, newLayoutName);
        dispatch(FormLayoutActions.updateSelectedLayout(newLayoutName));
        setOpenAccordion(newLayoutName);
      }
    }
  };

  /**
   * Displays the pages as an ordered list
   */
  const displayPageAccordions = layoutOrder.map((pageName, i) => {
    const layout = formLayoutData?.find((formLayout) => formLayout.page === pageName);

    // If the layout does not exist, return null
    if (layout === undefined) return null;

    return (
      <PageAccordion
        pageName={layout.page}
        key={i}
        isOpen={layout.page === openAccordion}
        onClick={() => handleClickAccordion(layout.page)}
      >
        {layout.page === openAccordion && <FormLayout layout={layout.data} />}
      </PageAccordion>
    );
  });

  return (
    <div className={classes.root}>
      <div>
        <div className={classes.wrapper}>
          <div className={classes.accordionWrapper}>
            <Accordion color='neutral'>{displayPageAccordions}</Accordion>
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
      <div className={classes.buttonContainer}>
        <StudioButton
          icon={<PlusIcon />}
          onClick={() => handleAddPage(false)}
          size='small'
          className={classes.button}
        >
          {t('ux_editor.pages_add')}
        </StudioButton>
      </div>
    </div>
  );
};
