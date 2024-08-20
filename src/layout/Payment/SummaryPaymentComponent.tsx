import React from 'react';

import { Label, Paragraph } from '@digdir/designsystemet-react';

import { Caption } from 'src/components/form/Caption';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { usePaymentInformation } from 'src/features/payment/PaymentInformationProvider';
import { getInstanceReferenceNumber } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import classes from 'src/layout/Payment/PaymentComponent.module.css';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { formatDateLocale } from 'src/utils/formatDateLocale';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export const SummaryPaymentComponent = ({ targetNode }: SummaryRendererProps<'Payment'>) => {
  const textResourceBindings = useNodeItem(targetNode, (i) => i.textResourceBindings);
  const selectedLanguage = useCurrentLanguage();
  const paymentInfo = usePaymentInformation();
  const instance = useLaxInstanceData();
  const privatePersonPayer = paymentInfo?.paymentDetails?.payer.privatePerson;
  const reciever = paymentInfo?.orderDetails?.receiver;
  const cardExpiryDate = paymentInfo?.paymentDetails?.cardDetails?.expiryDate;

  return (
    <div className={classes.paymentSummaryContainer}>
      <div className={classes.infoDetailsContainer}>
        {paymentInfo?.paymentDetails?.paymentId && (
          <Paragraph
            size={'small'}
            spacing={false}
          >
            <Lang id={'payment.receipt.payment_id'} />: <b>{paymentInfo.paymentDetails.paymentId}</b>
          </Paragraph>
        )}
        {instance && (
          <Paragraph
            size={'small'}
            spacing={false}
          >
            <Lang id={'payment.receipt.altinn_ref'} />: <b>{getInstanceReferenceNumber(instance)}</b>
          </Paragraph>
        )}
        {paymentInfo?.paymentDetails?.chargedDate && (
          <Paragraph
            size={'small'}
            spacing={false}
          >
            <Lang id={'payment.receipt.payment_date'} />:{' '}
            <b>{formatDateLocale(selectedLanguage, new Date(paymentInfo?.paymentDetails?.chargedDate))}</b>
          </Paragraph>
        )}
        <Paragraph
          size={'small'}
          spacing={false}
        >
          <Lang id={'payment.receipt.total_amount'} />:{' '}
          <b>
            {paymentInfo?.orderDetails.totalPriceIncVat} {paymentInfo?.orderDetails?.currency}
          </b>
        </Paragraph>
      </div>
      <div className={classes.senderReceiverInfoContainer}>
        <table>
          <Caption title={<Lang id={'payment.receipt.receiver'} />} />
          {paymentInfo?.orderDetails?.receiver?.name && (
            <tr>
              <th>
                <Paragraph
                  size={'small'}
                  variant='short'
                  spacing={false}
                >
                  <Lang id='payment.receipt.name' />
                </Paragraph>
              </th>
              <td>
                <Label
                  size={'small'}
                  spacing={false}
                  asChild
                >
                  <span>{paymentInfo?.orderDetails?.receiver?.name}</span>
                </Label>
              </td>
            </tr>
          )}
          {reciever?.phoneNumber && (
            <tr>
              <th>
                <Paragraph
                  size={'small'}
                  spacing={false}
                >
                  <Lang id='payment.receipt.phone' />
                </Paragraph>
              </th>
              <td>
                <Label
                  size={'small'}
                  spacing={false}
                  asChild
                >
                  <span>
                    {reciever?.phoneNumber.prefix} {reciever.phoneNumber.number}
                  </span>
                </Label>
              </td>
            </tr>
          )}
          {reciever?.postalAddress && (
            <tr>
              <th>
                <Paragraph
                  size={'small'}
                  spacing={false}
                >
                  <Lang id='payment.receipt.address' />
                </Paragraph>
              </th>
              <td>
                <Label
                  size={'small'}
                  spacing={false}
                  asChild
                >
                  <span>
                    {reciever?.postalAddress.addressLine1} {reciever?.postalAddress.postalCode}{' '}
                    {reciever?.postalAddress.city} {reciever?.postalAddress.country}
                    {reciever.postalAddress.addressLine2 && (
                      <>
                        <br />
                        {reciever?.postalAddress.addressLine2}
                      </>
                    )}
                  </span>
                </Label>
              </td>
            </tr>
          )}
          {paymentInfo?.orderDetails?.receiver?.organisationNumber && (
            <tr>
              <th>
                <Paragraph
                  size={'small'}
                  spacing={false}
                >
                  <Lang id='payment.receipt.org_num' />
                </Paragraph>
              </th>
              <td>
                <Label
                  size={'small'}
                  spacing={false}
                  asChild
                >
                  <span>{paymentInfo?.orderDetails?.receiver?.organisationNumber}</span>
                </Label>
              </td>
            </tr>
          )}
          {reciever?.bankAccountNumber && (
            <tr>
              <th>
                <Paragraph
                  size={'small'}
                  spacing={false}
                >
                  <Lang id='payment.receipt.account_number' />
                </Paragraph>
              </th>
              <td>
                <Label
                  size={'small'}
                  spacing={false}
                  asChild
                >
                  <span>{reciever.bankAccountNumber}</span>
                </Label>
              </td>
            </tr>
          )}
          {reciever?.email && (
            <tr>
              <th>
                <Paragraph
                  size={'small'}
                  spacing={false}
                >
                  <Lang id='payment.receipt.email' />
                </Paragraph>
              </th>
              <td>
                <Label
                  size={'small'}
                  spacing={false}
                  asChild
                >
                  <span>{reciever.email}</span>
                </Label>
              </td>
            </tr>
          )}
        </table>

        {privatePersonPayer && (
          <table>
            <Caption title={<Lang id={'payment.receipt.payer'} />} />

            {privatePersonPayer.firstName && (
              <tr>
                <th>
                  <Paragraph
                    size={'small'}
                    spacing={false}
                  >
                    <Lang id={'payment.receipt.name'}></Lang>
                  </Paragraph>
                </th>
                <td>
                  <Label
                    size={'small'}
                    spacing={false}
                    asChild
                  >
                    <span>{`${privatePersonPayer.firstName} ${privatePersonPayer.lastName}`}</span>
                  </Label>
                </td>
              </tr>
            )}
            {privatePersonPayer.phoneNumber?.number && (
              <tr>
                <th>
                  <Paragraph
                    size={'small'}
                    spacing={false}
                  >
                    <Lang id={'payment.receipt.phone'}></Lang>
                  </Paragraph>
                </th>
                <td>
                  <Label
                    size={'small'}
                    spacing={false}
                    asChild
                  >
                    <span>
                      {privatePersonPayer.phoneNumber.prefix} {privatePersonPayer.phoneNumber.number}
                    </span>
                  </Label>
                </td>
              </tr>
            )}

            {privatePersonPayer.email && (
              <tr>
                <th>
                  <Paragraph
                    size={'small'}
                    spacing={false}
                  >
                    <Lang id={'payment.receipt.email'}></Lang>
                  </Paragraph>
                </th>
                <td>
                  <Label
                    size={'small'}
                    spacing={false}
                    asChild
                  >
                    <span>{privatePersonPayer.email}</span>
                  </Label>
                </td>
              </tr>
            )}
            {paymentInfo?.paymentDetails?.cardDetails?.maskedPan && (
              <tr>
                <th>
                  <Paragraph
                    size={'small'}
                    spacing={false}
                  >
                    <Lang id={'payment.receipt.card_number'}></Lang>
                  </Paragraph>
                </th>
                <td>
                  <Label
                    size={'small'}
                    spacing={false}
                    asChild
                  >
                    <span>{paymentInfo?.paymentDetails?.cardDetails?.maskedPan}</span>
                  </Label>
                </td>
              </tr>
            )}
            {paymentInfo?.paymentDetails?.cardDetails?.expiryDate && (
              <tr>
                <th>
                  <Paragraph
                    size={'small'}
                    spacing={false}
                  >
                    <Lang id={'payment.receipt.card_expiry'}></Lang>
                  </Paragraph>
                </th>
                <td>
                  <Label
                    size={'small'}
                    spacing={false}
                    asChild
                  >
                    <span>{`${cardExpiryDate?.slice(0, 2)}/${cardExpiryDate?.slice(2)}`}</span>
                  </Label>
                </td>
              </tr>
            )}
          </table>
        )}
      </div>

      <PaymentDetailsTable
        orderDetails={paymentInfo?.orderDetails}
        tableTitle={textResourceBindings?.title}
        description={textResourceBindings?.description}
      />
    </div>
  );
};
