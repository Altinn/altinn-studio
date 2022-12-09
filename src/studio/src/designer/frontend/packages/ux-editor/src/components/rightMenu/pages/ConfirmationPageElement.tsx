import React from 'react';
import type { IAppState } from 'packages/ux-editor/src/types/global';
import { Button, ButtonVariant } from '@altinn/altinn-design-system';
import { FormLayoutActions } from '../../../features/formDesigner/formLayout/formLayoutSlice';
import { PageElement } from './PageElement';
import { useDispatch, useSelector } from 'react-redux';
import { deepCopy } from 'app-shared/pure';
import { useSearchParams } from 'react-router-dom';
import { Warning } from '@navikt/ds-icons';
import classes from './ConfirmationPageElement.module.css';

export function ConfirmationPageElement() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const confirmationOnScreenName = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.confirmationOnScreenName
  );
  const handleAddPage = () => {
    dispatch(FormLayoutActions.addLayout({ layout: 'Kvittering', isConfirmationPage: true }));
    setSearchParams({ ...deepCopy(searchParams), layout: 'Kvittering' });
  };
  return confirmationOnScreenName ? (
    <>
      <PageElement name={confirmationOnScreenName} />
      <div className={classes.warningbox}>
        <Warning /> Denne funksjonaliteten er enda ikke implementert i Appene.
      </div>
    </>
  ) : (
    <Button variant={ButtonVariant.Quiet} onClick={handleAddPage}>
      Opprett kvitteringsside
    </Button>
  );
}
