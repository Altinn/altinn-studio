import React from 'react';
import { render, screen } from '@testing-library/react';
import { ObjectRestrictions } from './ObjectRestrictions';
import { FieldType, getRestrictions } from '@altinn/schema-model';

test('ObjectRestrictions should redner correctly', async () => {
  const onChangeRestrictionValue = jest.fn();
  const path = '#/properties/xxsfds';
  render(
    <ObjectRestrictions
      onChangeRestrictionValue={onChangeRestrictionValue}
      language={{}}
      path={path}
      readonly={false}
      restrictions={[]}
    />,
  );
  const texts = getRestrictions(FieldType.Object);
  texts.forEach((text) => {
    expect(screen.getByLabelText(text)).toBeDefined();
  });
});
