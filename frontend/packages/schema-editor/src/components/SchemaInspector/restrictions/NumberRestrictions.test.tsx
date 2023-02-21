import React from 'react';
import { render, screen } from '@testing-library/react';
import { NumberRestrictions } from './NumberRestrictions';
import { IntRestrictionKeys } from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';

// Test data:
const restrictionKeyTexts: { [key in IntRestrictionKeys]: string } = {
  [IntRestrictionKeys.minimum]: 'Minimum',
  [IntRestrictionKeys.maximum]: 'Maksimum',
  [IntRestrictionKeys.exclusiveMinimum]: 'Eksklusiv minimum',
  [IntRestrictionKeys.exclusiveMaximum]: 'Eksklusiv maksimum',
  [IntRestrictionKeys.multipleOf]: 'Multiplum av',
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

test('NumberRestrictions should render correctly', async () => {
  const onChangeRestrictionValue = jest.fn();
  const path = '#/properties/xxsfds';
  render(
    <NumberRestrictions
      onChangeRestrictionValue={onChangeRestrictionValue}
      path={path}
      readonly={false}
      restrictions={[]}
      onChangeRestrictions={() => undefined}
    />
  );
  Object.values(IntRestrictionKeys).forEach((key) => {
    expect(screen.getByLabelText(restrictionKeyTexts[key])).toBeDefined();
  });
});
