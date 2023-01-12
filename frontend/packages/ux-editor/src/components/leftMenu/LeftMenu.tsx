import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IAppState } from '../../types/global';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { Add } from '@navikt/ds-icons';
import { PagesContainer } from './PagesContainer';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import { ReceiptPageElement } from './ReceiptPageElement';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { deepCopy } from 'app-shared/pure';
import { useSearchParams } from 'react-router-dom';
import classes from './LeftMenu.module.css';
import { useText } from '../../hooks';

export const LeftMenu = () => {
  const dispatch = useDispatch();

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayout: string = useSelector(
    (state: IAppState) => state.formDesigner.layout.selectedLayout
  );
  const receiptLayoutName = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.receiptLayoutName
  );
  const layoutOrder = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order
  );
  const t = useText();

  function handleAddPage() {
    const name = t('left_menu.page') + (layoutOrder.length + 1);
    dispatch(FormLayoutActions.addLayout({ layout: name, isReceiptPage: false }));
    setSearchParams({ ...deepCopy(searchParams), layout: name });
  }

  return <div className={classes.leftMenu}>
    <div className={classes.pagesHeader}>
      <span>{t('left_menu.pages')}</span>
      <Button
        aria-label={t('left_menu.pages_add_alt')}
        icon={<Add />}
        onClick={handleAddPage}
        variant={ButtonVariant.Quiet}
        color={ButtonColor.Secondary}
      />
    </div>
    <div className={classes.pagesList}>
      <PagesContainer />
    </div>
    {!_useIsProdHack() && <div className={classes.receipt}><ReceiptPageElement /></div>}
    <div className={classes.toolbar}>
      {receiptLayoutName === selectedLayout ? <ConfPageToolbar/> : <DefaultToolbar/>}
    </div>
  </div>;
};
