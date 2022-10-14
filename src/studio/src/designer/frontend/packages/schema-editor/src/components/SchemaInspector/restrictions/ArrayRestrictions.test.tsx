import React from 'react';
import { render, screen } from '@testing-library/react';
import { ArrayRestrictions } from './ArrayRestrictions';
import { ArrRestrictionKeys } from '@altinn/schema-model';

test('ArrayRestrictions should render correctly', async () => {
  const onChangeRestrictionValue = jest.fn();
  const path = '#/properties/xxsfds';
  render(
    <ArrayRestrictions
      onChangeRestrictionValue={onChangeRestrictionValue}
      language={{}}
      path={path}
      readonly={false}
      restrictions={[]}
    />,
  );
  Object.values(ArrRestrictionKeys).forEach((text) => {
    expect(screen.getByLabelText(text)).toBeDefined();
  });
});
