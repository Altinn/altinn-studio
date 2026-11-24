import React from 'react';

import { BaseTable } from '@app/form-component';
import { Label } from '@digdir/designsystemet-react';

import { Caption } from 'src/components/form/caption/Caption';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/PaymentDetails/PaymentDetailsTable.module.css';
import type { OrderDetails } from 'src/features/payment/types';

type PaymentDetailsTableProps = {
  orderDetails?: OrderDetails;
  tableTitle?: string;
  description?: string;
  help?: string;
} & React.HTMLAttributes<HTMLTableElement>;

export const PaymentDetailsTable = ({
  orderDetails,
  tableTitle,
  description,
  help,
  ...rest
}: PaymentDetailsTableProps) => (
  <BaseTable {...rest}>
    {tableTitle && (
      <Caption
        title={<Lang id={tableTitle} />}
        description={description && <Lang id={description} />}
        helpText={help ? { text: <Lang id={help} />, accessibleTitle: tableTitle } : undefined}
      />
    )}

    <BaseTable.Head>
      <BaseTable.Row>
        <BaseTable.HeaderCell>
          <Lang id='payment.component.description' />
        </BaseTable.HeaderCell>
        <BaseTable.HeaderCell align='right'>
          <Lang id='payment.component.quantity' />
        </BaseTable.HeaderCell>
        <BaseTable.HeaderCell align='right'>
          <Lang id='payment.component.price' />
        </BaseTable.HeaderCell>
      </BaseTable.Row>
    </BaseTable.Head>
    <BaseTable.Body>
      {orderDetails?.orderLines.map((orderLine) => (
        <BaseTable.Row
          key={orderLine.id}
          className={classes.tableRow}
        >
          <BaseTable.Cell>{orderLine.name}</BaseTable.Cell>
          <BaseTable.Cell align='right'>{orderLine.quantity}</BaseTable.Cell>
          <BaseTable.Cell align='right'>
            {orderLine.priceExVat * orderLine.quantity} {orderDetails?.currency}
          </BaseTable.Cell>
        </BaseTable.Row>
      ))}
      {!!orderDetails?.totalVat && orderDetails.totalVat > 0 && (
        <BaseTable.Row className={classes.tableRow}>
          <BaseTable.Cell colSpan={2}>
            <Label>
              <Lang id='payment.component.vat' />
            </Label>
          </BaseTable.Cell>
          <BaseTable.Cell align='right'>
            {orderDetails?.totalVat} {orderDetails?.currency}
          </BaseTable.Cell>
        </BaseTable.Row>
      )}
      <BaseTable.Row className={classes.tableRow}>
        <BaseTable.Cell colSpan={2}>
          <Label>
            <Lang id='payment.component.total' />
          </Label>
        </BaseTable.Cell>
        <BaseTable.Cell align='right'>
          {orderDetails?.totalPriceIncVat} {orderDetails?.currency}
        </BaseTable.Cell>
      </BaseTable.Row>
    </BaseTable.Body>
  </BaseTable>
);
