import { renderHook } from '@testing-library/react';
import type { IFormatting } from '@app/layout-contract/generated/common.generated';

import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { useResolvedFormatting } from 'src/layout/Input/formatting';
import { formatNumericText } from 'src/utils/formattingUtils';

vi.mock('src/features/expressions/runtime/useExpressionDataSources', () => ({
  useExpressionDataSources: () => ({}),
}));

it.each<{ formatting: IFormatting; value: string; language: string; expected: string }>([
  {
    formatting: { currency: 'NOK', number: { prefix: 'SEK ' } },
    value: '10000',
    language: 'en',
    expected: 'SEK 10,000',
  },
  {
    formatting: { currency: 'NOK', position: 'suffix', number: { decimalScale: 0 } },
    value: '0',
    language: 'nb',
    expected: '0 kr',
  },
])(
  'preserves currency defaults when number formatting overrides only some properties: $expected',
  ({ formatting, value, language, expected }) => {
    const { result } = renderHook(() => useResolvedFormatting(formatting));
    expect(result.current?.number).toEqual(formatting.number);
    const number = getMapToReactNumberConfig(result.current, value, language).number;
    if (!number) {
      throw new Error('Expected numeric formatting');
    }
    expect(formatNumericText(value, number)).toBe(expected);
  },
);
