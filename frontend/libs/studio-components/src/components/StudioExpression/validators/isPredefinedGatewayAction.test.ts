import { isPredefinedGatewayAction } from './isPredefinedGatewayAction';

describe('isPredefinedGatewayAction', () => {
  it.each(['sign', 'pay', 'reject', 'confirm'])(
    'Returns true when the input expression is "%s"',
    (value) => {
      expect(isPredefinedGatewayAction(value)).toBe(true);
    },
  );

  it('Returns false when the input expression is not a predefined gateway action', () => {
    expect(isPredefinedGatewayAction('invalidAction')).toBe(false);
  });
});
