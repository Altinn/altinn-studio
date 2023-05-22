import React from 'react';
import { useSelector } from 'react-redux';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { PagesContainer } from './PagesContainer';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import { ReceiptPageElement } from './ReceiptPageElement';
import { deepCopy } from 'app-shared/pure';
import { useParams, useSearchParams } from 'react-router-dom';
import classes from './LeftMenu.module.css';
import { useText } from '../../hooks';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useAddLayoutMutation } from '../../hooks/mutations/useAddLayoutMutation';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useDispatch } from 'react-redux';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';

export const LeftMenu = () => {
  const { org, app } = useParams();
  const dispatch = useDispatch();
  const addLayoutMutation = useAddLayoutMutation(org, app);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayout: string = useSelector(selectedLayoutNameSelector);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app);
  const { pages, receiptLayoutName } = formLayoutSettingsQuery.data;
  const layoutOrder = pages.order;

  const t = useText();

  function handleAddPage() {
    let count = 1;
    let name = t('left_menu.page') + (layoutOrder.length + count);
    while (layoutOrder.indexOf(name) > -1) {
      count += 1;
      name = t('left_menu.page') + (layoutOrder.length + count);
    }
    addLayoutMutation.mutate({ layoutName: name, isReceiptPage: false });
    setSearchParams({ ...deepCopy(searchParams), layout: name });
    dispatch(FormLayoutActions.updateSelectedLayout(name));
  }

  return (
    <div className={classes.leftMenu} data-testid={'ux-editor.left-menu'}>
      <div className={classes.pagesHeader}>
        <span>{t('left_menu.pages')}</span>
        <Button
          aria-label={t('left_menu.pages_add_alt')}
          icon={<PlusIcon />}
          onClick={handleAddPage}
          variant={ButtonVariant.Quiet}
          color={ButtonColor.Secondary}
        />
      </div>
      <div className={classes.pagesList}>
        <PagesContainer />
      </div>
        <div className={classes.receipt}>
          <ReceiptPageElement />
        </div>
      <div className={classes.toolbar}>
        {receiptLayoutName === selectedLayout ? <ConfPageToolbar /> : <DefaultToolbar />}
      </div>
    </div>
  );
};
