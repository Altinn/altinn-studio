import React from 'react';
import type { IAppState } from 'packages/ux-editor/src/types/global';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { PageElement } from './PageElement';
import { useDispatch, useSelector } from 'react-redux';
import { deepCopy } from 'app-shared/pure';
import { useSearchParams } from 'react-router-dom';
import classes from './ReceiptPageElement.module.css';

export function ReceiptPageElement() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const receiptName = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.receiptLayoutName
  );
  const handleAddPage = () => {
    dispatch(FormLayoutActions.addLayout({ layout: 'Kvittering', isReceiptPage: true }));
    setSearchParams({ ...deepCopy(searchParams), layout: 'Kvittering' });
  };
  return receiptName ? (
    <div className={classes.pageElementWrapper}>
      <PageElement name={receiptName}/>
    </div>
    ) : (
      <div className={classes.buttonWrapper}>
        <Button variant={ButtonVariant.Quiet} onClick={handleAddPage}>
          Opprett kvitteringsside
        </Button>
      </div>
    );
}
