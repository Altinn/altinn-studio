import React from 'react';
import { render, screen } from '@testing-library/react';
import { NumberRestrictions } from './NumberRestrictions';
import { getRestrictions } from '@altinn/schema-model';
import { FieldType } from '../../../types';

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
