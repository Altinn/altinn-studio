import React from 'react';
import { render, screen } from '@testing-library/react';
import { BooleanRestrictions } from './BooleanRestrictions';
import { getRestrictions } from '../../../utils/restrictions';
import { FieldType } from '../../../types';

test('BooleanRestrictions should redner correctly', async () => {
  const onChangeRestrictionValue = jest.fn();
  const path = '#/properties/xxsfds';
  render(
    <BooleanRestrictions
      onChangeRestrictionValue={onChangeRestrictionValue}
      language={{}}
      path={path}
      readonly={false}
      restrictions={[]}
    />,
  );
  const texts = getRestrictions(FieldType.Boolean);
  texts?.forEach((text) => {
    expect(screen.getByLabelText(text)).toBeDefined();
  });
});
