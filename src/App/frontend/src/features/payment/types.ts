export enum PaymentStatus {
  Created = 'Created',
  Skipped = 'Skipped',
  Uninitialized = 'Uninitialized',
  Paid = 'Paid',
  Failed = 'Failed',
}

export interface PaymentResponsePayload {
  taskId: string;
  status: PaymentStatus;
  orderDetails: OrderDetails;
  paymentDetails?: PaymentDetails;
}

export interface PaymentDetails {
  paymentId: string;
  redirectUrl: string;
  receiptUrl?: string;
  payer: Payer;
  cardDetails?: CardDetails;
  chargedDate?: string;
  createdDate?: string;
}

interface CardDetails {
  maskedPan?: string;
  expiryDate?: string;
}

interface Receiver {
  organisationNumber: string;
  name: string;
  email: string;
  phoneNumber: PhoneNumber;
  bankAccountNumber: string;
  postalAddress: Address;
}

interface PhoneNumber {
  prefix: string | null;
  number: string | null;
}

interface Person {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: PhoneNumber;
}

interface Address {
  name: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
}

interface Company {
  organisationNumber?: string;
  name?: string;
  ContactPerson?: Person;
}

interface Payer {
  privatePerson?: Person;
  company?: Company;
  shippingAddress?: Address;
  billingAddress?: Address;
}

export interface OrderDetails {
  paymentProcessorId: string;
  orderReference?: string;
  currency: string;
  orderLines: OrderLine[];
  totalPriceExVat: number;
  totalVat: number;
  totalPriceIncVat: number;
  receiver?: Receiver;
}

export interface OrderLine {
  id: string;
  name: string;
  textResourceKey: string;
  priceExVat: number;
  quantity: number;
  vatPercent: number;
  unit: string;
}
