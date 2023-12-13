import React from 'react';
import { render, screen } from '@testing-library/react';
import { ObjectRestrictions } from './ObjectRestrictions';

test('ObjectRestrictions should redner correctly', async () => {
  const onChangeRestrictionValue = jest.fn();
  const path = '#/properties/xxsfds';
  render(
    <ObjectRestrictions
      onChangeRestrictionValue={onChangeRestrictionValue}
      path={path}
      readonly={false}
      restrictions={[]}
      onChangeRestrictions={() => undefined}
    />,
  );
  expect(screen.queryAllByRole('textbox')).toHaveLength(0);
});
