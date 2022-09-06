import React from 'react';
import { render, screen } from '@testing-library/react';
import { CombinationSelect } from './CombinationSelect';

test('CombinationSelectBox should work', async () => {
  const onChange = jest.fn();
  const options = [
    {
      label: 'Hello',
      value: 'hello',
    },
    {
      label: 'World',
      value: 'world',
    },
  ];
  render(
    <CombinationSelect
      onChange={onChange}
      id={'system-under-test'}
      label={''}
      options={options}
      value={options[1].value}
    />,
  );
  const testbox = screen.getByRole('button');
  expect(testbox).toBeDefined();
});
