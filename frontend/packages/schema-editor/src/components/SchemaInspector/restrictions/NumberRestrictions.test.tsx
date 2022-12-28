import React from 'react';
import { render, screen } from '@testing-library/react';
import { NumberRestrictions } from './NumberRestrictions';
import { IntRestrictionKeys } from '@altinn/schema-model';

test('NumberRestrictions should redner correctly', async () => {
  const onChangeRestrictionValue = jest.fn();
  const path = '#/properties/xxsfds';
  render(
    <NumberRestrictions
      onChangeRestrictionValue={onChangeRestrictionValue}
      language={{}}
      path={path}
      readonly={false}
      restrictions={[]}
      onChangeRestrictions={() => undefined}
    />
  );
  Object.values(IntRestrictionKeys).forEach((text) => {
    expect(screen.getByLabelText(text)).toBeDefined();
  });
});
