export const orderDetailsResponsePayload = {
  orderReference: '',
  currency: 'NOK',
  paymentProcessorId: 'Nets Easy',
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
};
