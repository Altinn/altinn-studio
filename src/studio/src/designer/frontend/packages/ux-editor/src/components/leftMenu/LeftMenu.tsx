import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IAppState } from '../../types/global';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';
import { Add } from '@navikt/ds-icons';
import { PagesContainer } from './PagesContainer';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import { ConfirmationPageElement } from './ConfirmationPageElement';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { deepCopy } from 'app-shared/pure';
import { useSearchParams } from 'react-router-dom';
import { getLanguageFromKey } from 'app-shared/utils/language';
import classes from './LeftMenu.module.css';

export const LeftMenu = () => {
  const dispatch = useDispatch();

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayout: string = useSelector(
    (state: IAppState) => state.formDesigner.layout.selectedLayout
  );
  const confirmationOnScreenName = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.confirmationOnScreenName
  );
  const layoutOrder = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order
  );
  const language: object = useSelector((state: IAppState) => state.appData.languageState.language);
  const t = (key: string) => getLanguageFromKey(key, language);

  function handleAddPage() {
    const name = t('left_menu.page') + (layoutOrder.length + 1);
    dispatch(FormLayoutActions.addLayout({ layout: name, isConfirmationPage: false }));
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
    {!_useIsProdHack() && <div className={classes.receipt}><ConfirmationPageElement /></div>}
    <div className={classes.toolbar}>
      {confirmationOnScreenName === selectedLayout ? <ConfPageToolbar/> : <DefaultToolbar/>}
    </div>
  </div>;
};
