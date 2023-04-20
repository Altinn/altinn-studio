import React from 'react';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { PageElement } from './PageElement';
import { deepCopy } from 'app-shared/pure';
import { useParams, useSearchParams } from 'react-router-dom';
import classes from './ReceiptPageElement.module.css';
import { useAddLayoutMutation } from '../../hooks/mutations/useAddLayoutMutation';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';

export function ReceiptPageElement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { org, app } = useParams();
  const addLayoutMutation = useAddLayoutMutation(org, app);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app);
  const receiptName = formLayoutSettingsQuery.data.receiptLayoutName;
  const handleAddPage = () => {
    addLayoutMutation.mutate({ layoutName: 'Kvittering', isReceiptPage: true });
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
