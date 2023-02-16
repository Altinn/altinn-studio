import React from 'react';

import { render } from '@testing-library/react';

import { SummaryComponentSwitch } from 'src/components/summary/SummaryComponentSwitch';

describe('SummaryComponentSwitch', () => {
  test('should not render component', () => {
    const { container } = render(
      <SummaryComponentSwitch
        id='summary-comp-id'
        change={{
          changeText: 'change',
          onChangeClick: jest.fn(),
        }}
      />,
    );
    expect(container.childElementCount).toBe(0);
    expect(container.firstChild).toBeNull();
  });
});
