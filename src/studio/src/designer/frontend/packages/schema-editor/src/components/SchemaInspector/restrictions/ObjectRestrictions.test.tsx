import React from 'react';
import { render, screen } from '@testing-library/react';
import { ObjectRestrictions } from './ObjectRestrictions';
import { ObjRestrictionKeys } from '@altinn/schema-model';

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
  Object.values(ObjRestrictionKeys).forEach((text) => {
    expect(screen.getByLabelText(text)).toBeDefined();
  });
});
