import React from 'react';

import { Label, Paragraph } from '@digdir/designsystemet-react';

import { Caption } from 'src/components/form/caption/Caption';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { usePaymentInformation } from 'src/features/payment/PaymentInformationProvider';
import { getInstanceReferenceNumber } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import classes from 'src/layout/Payment/PaymentReceiptDetails/PaymentReceiptDetails.module.css';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { formatDateLocale } from 'src/utils/dateUtils';
import { typedBoolean } from 'src/utils/typing';

type PaymentInfoTableRowProps = {
  labelId: string;
  value: React.ReactNode;
};

// Reusable TableRow Component
const PaymentInfoTableRow = ({ labelId, value }: PaymentInfoTableRowProps) => (
  <tr>
    <th>
      <Paragraph
        data-size='sm'
        data-spacing={false}
      >
        <Lang id={labelId} />
      </Paragraph>
    </th>
    <td>
      <Label
        data-size='sm'
        data-spacing={false}
        asChild
      >
        <span>{value}</span>
      </Label>
    </td>
  </tr>
);

type PaymentInfoTableProps = {
  titleId: string;
  rows: PaymentInfoTableRowProps[];
};

// Reusable Table Component
const PaymentInfoTable = ({ titleId, rows }: PaymentInfoTableProps) => (
  <table>
    <Caption title={<Lang id={titleId} />} />
    {rows.map(({ labelId, value }, index) => (
      <PaymentInfoTableRow
        key={`${labelId}-${index}`}
        labelId={labelId}
        value={value}
      />
    ))}
  </table>
);

type PaymentReceiptDetailsProps = {
  title?: string;
  description?: string;
};

export const PaymentReceiptDetails = ({ title, description }: PaymentReceiptDetailsProps) => {
  const selectedLanguage = useCurrentLanguage();
  const paymentInfo = usePaymentInformation();
  const instanceId = useLaxInstanceId();
  const receiver = paymentInfo?.orderDetails?.receiver;
  const payer = paymentInfo?.paymentDetails?.payer;
  const privatePersonPayer = payer?.privatePerson;
  const companyPayer = payer?.company;
  const cardExpiryDate = paymentInfo?.paymentDetails?.cardDetails?.expiryDate;
  const receiverPostalAddress = receiver?.postalAddress;
  const payerPostalAddress = payer?.shippingAddress;

  const receiverRows: PaymentInfoTableRowProps[] = [
    receiver?.name && { labelId: 'payment.receipt.name', value: receiver?.name },
    receiver?.phoneNumber && {
      labelId: 'payment.receipt.phone',
      value: `${receiver?.phoneNumber.prefix} ${receiver.phoneNumber.number}`,
    },
    receiverPostalAddress && {
      labelId: 'payment.receipt.address',
      value: `${receiverPostalAddress?.addressLine1} ${receiverPostalAddress?.postalCode} ${receiverPostalAddress?.city} ${receiverPostalAddress?.country}`,
    },
    receiver?.organisationNumber && { labelId: 'payment.receipt.org_num', value: receiver?.organisationNumber },
    receiver?.bankAccountNumber && { labelId: 'payment.receipt.account_number', value: receiver?.bankAccountNumber },
    receiver?.email && { labelId: 'payment.receipt.email', value: receiver?.email },
  ].filter(typedBoolean);

  const payerRows: PaymentInfoTableRowProps[] = [
    privatePersonPayer?.firstName && {
      labelId: 'payment.receipt.name',
      value: `${privatePersonPayer.firstName} ${privatePersonPayer.lastName}`,
    },
    privatePersonPayer?.phoneNumber?.number && {
      labelId: 'payment.receipt.phone',
      value: `${privatePersonPayer.phoneNumber.prefix} ${privatePersonPayer.phoneNumber.number}`,
    },
    privatePersonPayer?.email && { labelId: 'payment.receipt.email', value: privatePersonPayer.email },
    companyPayer?.name && { labelId: 'payment.receipt.company_name', value: companyPayer.name },
    companyPayer?.organisationNumber && {
      labelId: 'payment.receipt.org_number',
      value: companyPayer.organisationNumber,
    },
    companyPayer?.ContactPerson?.firstName && {
      labelId: 'payment.receipt.contact_person',
      value: `${companyPayer.ContactPerson.firstName} ${companyPayer.ContactPerson.lastName}`,
    },
    companyPayer?.ContactPerson?.phoneNumber?.number && {
      labelId: 'payment.receipt.contact_phone',
      value: `${companyPayer.ContactPerson.phoneNumber.prefix} ${companyPayer.ContactPerson.phoneNumber.number}`,
    },
    companyPayer?.ContactPerson?.email && {
      labelId: 'payment.receipt.contact_email',
      value: companyPayer.ContactPerson.email,
    },
    payerPostalAddress && {
      labelId: 'payment.receipt.address',
      value: `${payerPostalAddress?.addressLine1} ${payerPostalAddress?.postalCode} ${payerPostalAddress?.city} ${payerPostalAddress?.country}`,
    },
    paymentInfo?.paymentDetails?.cardDetails?.maskedPan && {
      labelId: 'payment.receipt.card_number',
      value: paymentInfo?.paymentDetails?.cardDetails?.maskedPan,
    },
    cardExpiryDate && {
      labelId: 'payment.receipt.card_expiry',
      value: `${cardExpiryDate.slice(0, 2)}/${cardExpiryDate.slice(2)}`,
    },
  ].filter(typedBoolean);

  return (
    <div className={classes.paymentSummaryContainer}>
      <div className={classes.infoDetailsContainer}>
        {paymentInfo?.paymentDetails?.paymentId && (
          <Paragraph
            data-size='sm'
            data-spacing={false}
          >
            <Lang id='payment.receipt.payment_id' />: <b>{paymentInfo.paymentDetails.paymentId}</b>
          </Paragraph>
        )}
        {instanceId && (
          <Paragraph
            data-size='sm'
            data-spacing={false}
          >
            <Lang id='payment.receipt.altinn_ref' />: <b>{getInstanceReferenceNumber(instanceId)}</b>
          </Paragraph>
        )}
        {paymentInfo?.paymentDetails?.chargedDate && (
          <Paragraph
            data-size='sm'
            data-spacing={false}
          >
            <Lang id='payment.receipt.payment_date' />:{' '}
            <b>{formatDateLocale(selectedLanguage, new Date(paymentInfo?.paymentDetails?.chargedDate))}</b>
          </Paragraph>
        )}
        <Paragraph
          data-size='sm'
          data-spacing={false}
        >
          <Lang id='payment.receipt.total_amount' />:{' '}
          <b>
            {paymentInfo?.orderDetails.totalPriceIncVat} {paymentInfo?.orderDetails?.currency}
          </b>
        </Paragraph>
      </div>

      <div className={classes.senderReceiverInfoContainer}>
        {receiver && (
          <PaymentInfoTable
            titleId='payment.receipt.receiver'
            rows={receiverRows}
          />
        )}
        {privatePersonPayer && (
          <PaymentInfoTable
            titleId='payment.receipt.payer'
            rows={payerRows}
          />
        )}
      </div>

      <PaymentDetailsTable
        orderDetails={paymentInfo?.orderDetails}
        tableTitle={title}
        description={description}
      />
    </div>
  );
};
