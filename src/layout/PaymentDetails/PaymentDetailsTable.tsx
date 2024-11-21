import React from 'react';

import { Label, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/PaymentDetails/PaymentDetailsTable.module.css';
import type { OrderDetails } from 'src/features/payment/types';

type PaymentDetailsTableProps = {
  orderDetails?: OrderDetails;
  tableTitle?: string;
  description?: string;
} & React.HTMLAttributes<HTMLTableElement>;

export const PaymentDetailsTable = ({ orderDetails, tableTitle, description, ...rest }: PaymentDetailsTableProps) => (
  <Table
    {...rest}
    className={cn(classes.orderDetailsTable, rest.className)}
  >
    {tableTitle && (
      <Caption
        title={<Lang id={tableTitle} />}
        description={description && <Lang id={description} />}
      />
    )}

    <Table.Head>
      <Table.Row>
        <Table.HeaderCell>
          <Lang id='payment.component.description' />
        </Table.HeaderCell>
        <Table.HeaderCell align='right'>
          <Lang id='payment.component.quantity' />
        </Table.HeaderCell>
        <Table.HeaderCell align='right'>
          <Lang id='payment.component.price' />
        </Table.HeaderCell>
      </Table.Row>
    </Table.Head>
    <Table.Body>
      {orderDetails?.orderLines.map((orderLine) => (
        <Table.Row
          key={orderLine.id}
          className={classes.tableRow}
        >
          <Table.Cell>{orderLine.name}</Table.Cell>
          <Table.Cell align='right'>{orderLine.quantity}</Table.Cell>
          <Table.Cell align='right'>
            {orderLine.priceExVat * orderLine.quantity} {orderDetails?.currency}
          </Table.Cell>
        </Table.Row>
      ))}
      {!!orderDetails?.totalVat && orderDetails.totalVat > 0 && (
        <Table.Row className={classes.tableRow}>
          <Table.Cell colSpan={2}>
            <Label>
              <Lang id='payment.component.vat' />
            </Label>
          </Table.Cell>
          <Table.Cell align='right'>
            {orderDetails?.totalVat} {orderDetails?.currency}
          </Table.Cell>
        </Table.Row>
      )}
      <Table.Row className={classes.tableRow}>
        <Table.Cell colSpan={2}>
          <Label>
            <Lang id='payment.component.total' />
          </Label>
        </Table.Cell>
        <Table.Cell align='right'>
          {orderDetails?.totalPriceIncVat} {orderDetails?.currency}
        </Table.Cell>
      </Table.Row>
    </Table.Body>
  </Table>
);
