import React from 'react';

import { render, screen } from '@testing-library/react';

import { ErrorPaper } from 'src/components/message/ErrorPaper';

describe('ErrorPaper', () => {
  it('should render the supplied message', async () => {
    render(<ErrorPaper message='mock message' />);
    const item = await screen.findByText('mock message');
    expect(item).not.toBe(null);
  });
});
