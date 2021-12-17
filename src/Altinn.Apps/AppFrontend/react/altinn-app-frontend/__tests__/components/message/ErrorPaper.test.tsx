import 'jest';
import * as React from 'react';
import '@testing-library/jest-dom/extend-expect';
import * as renderer from 'react-test-renderer';
import { render } from '@testing-library/react';
import ErrorPaper from '../../../src/components/message/ErrorPaper';

describe('components > message > ErrorPaper.tsx', () => {
  it('should match snapshot', () => {
    const rendered = renderer.create(
      <ErrorPaper
        message='mock message'
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should render the supplied message', async () => {
    const utils = render(
      <ErrorPaper
        message='mock message'
      />,
    );
    const item = await utils.findByText('mock message');
    expect(item).not.toBe(null);
  });
});
