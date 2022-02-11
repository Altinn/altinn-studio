import * as React from 'react';
import { render } from '@testing-library/react';
import ErrorPaper from './ErrorPaper';

describe('components > message > ErrorPaper.tsx', () => {
  it('should render the supplied message', async () => {
    const utils = render(<ErrorPaper message='mock message' />);
    const item = await utils.findByText('mock message');
    expect(item).not.toBe(null);
  });
});
