import React from 'react';
import { render, screen } from '@testing-library/react';
import { ArrayRestrictions } from './ArrayRestrictions';
import { ArrRestrictionKeys } from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';

// Test data:
const restrictionKeyTexts: { [key in ArrRestrictionKeys]: string } = {
  [ArrRestrictionKeys.minItems]: 'Minimum antall elementer',
  [ArrRestrictionKeys.maxItems]: 'Maksimum antall elementer',
  [ArrRestrictionKeys.uniqueItems]: 'Unike elementer',
};
const texts = Object.fromEntries(
  Object
    .entries(restrictionKeyTexts)
    .map(([key, value]) => [`schema_editor.${key}`, value])
);

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

test('ArrayRestrictions should render correctly', async () => {
  const onChangeRestrictionValue = jest.fn();
  const path = '#/properties/xxsfds';
  render(
    <ArrayRestrictions
      onChangeRestrictionValue={onChangeRestrictionValue}
      path={path}
      readonly={false}
      restrictions={[]}
      onChangeRestrictions={() => undefined}
    />
  );
  Object.values(ArrRestrictionKeys).forEach((key) => {
    expect(screen.getByLabelText(restrictionKeyTexts[key])).toBeDefined();
  });
});
