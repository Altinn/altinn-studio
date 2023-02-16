import React from 'react';

import { render } from '@testing-library/react';

import { ErrorPaper } from 'src/components/message/ErrorPaper';

describe('ErrorPaper', () => {
  it('should render the supplied message', async () => {
    const utils = render(<ErrorPaper message='mock message' />);
    const item = await utils.findByText('mock message');
    expect(item).not.toBe(null);
  });
});
