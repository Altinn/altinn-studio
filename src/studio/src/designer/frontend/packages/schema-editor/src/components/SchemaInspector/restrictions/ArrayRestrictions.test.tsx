import React from 'react';
import { render, screen } from '@testing-library/react';
import { ArrayRestrictions } from './ArrayRestrictions';
import { FieldType, getRestrictions } from '@altinn/schema-model';

test('ArrayRestrictions should redner correctly', async () => {
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
  const texts = getRestrictions(FieldType.Array);
  texts.forEach((text) => {
    expect(screen.getByLabelText(text)).toBeDefined();
  });
});
