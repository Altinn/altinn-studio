import React from 'react';
import { render, screen } from '@testing-library/react';
import { NumberRestrictions } from './NumberRestrictions';
import { FieldType, getRestrictions } from '@altinn/schema-model';

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
    />,
  );
  const texts = getRestrictions(FieldType.Number);
  texts?.forEach((text) => {
    expect(screen.getByLabelText(text)).toBeDefined();
  });
});
