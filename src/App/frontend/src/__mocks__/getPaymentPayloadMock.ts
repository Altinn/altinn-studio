import { PaymentStatus } from 'src/features/payment/types';
import type { PaymentResponsePayload } from 'src/features/payment/types';

export const paymentResponsePayload: PaymentResponsePayload = {
  taskId: 'Task_2',
  status: PaymentStatus.Paid,
  orderDetails: {
    paymentProcessorId: 'Nets Easy',
    currency: 'NOK',
    receiver: {
      organisationNumber: '971 526 157',
      name: 'Patentstyret',
      email: 'test@123.no',
      phoneNumber: {
        prefix: '+47',
        number: '12345678',
      },
      bankAccountNumber: '123456789',
      postalAddress: {
        name: 'Patentstyret',
        addressLine1: 'Postboks 4863 Nydalen',
        addressLine2: '',
        postalCode: 'N-0422',
        city: 'Oslo',
        country: 'Norway',
      },
    },
    orderLines: [
      {
        id: '0',
        name: 'A thing',
        textResourceKey: '',
        priceExVat: 50,
        quantity: 1,
        vatPercent: 25,
        unit: 'pcs',
      },
      {
        id: '1',
        name: 'Another thing',
        textResourceKey: '',
        priceExVat: 100,
        quantity: 1,
        vatPercent: 25,
        unit: 'pcs',
      },
    ],
    totalPriceExVat: 150,
    totalVat: 37.5,
    totalPriceIncVat: 187.5,
  },
  paymentDetails: {
    paymentId: '00cd000065f03e6a75269b94dc7c3321',
    redirectUrl:
      'https://test.checkout.dibspayment.eu/hostedpaymentpage/?checkoutKey=fc8ce23b003e4c20bc37000506fdb4a0&pid=00cd000065f03e6a75269b94dc7c38df',
    receiptUrl: 'https://test.checkout.dibspayment.eu/receipt/?paymentId=00cd000065f03e6a75269b94dc7c38df',
    payer: {
      privatePerson: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@example.com',
        phoneNumber: {
          prefix: '+47',
          number: '12345678',
        },
      },
      company: {
        organisationNumber: '123456789',
        name: 'Example Corp',
      },
      shippingAddress: {
        name: 'John Doe',
        addressLine1: '123 Main St',
        addressLine2: 'Suite 101',
        postalCode: '12345',
        city: 'Oslo',
        country: 'Norway',
      },
      billingAddress: {
        name: 'Example Corp',
        addressLine1: '123 Main St',
        addressLine2: 'Suite 101',
        postalCode: '12345',
        city: 'Oslo',
        country: 'Norway',
      },
    },
  },
};
