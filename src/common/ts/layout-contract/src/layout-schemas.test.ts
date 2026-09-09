import { describe, expect, it } from 'vitest';

import expressionSchema from '../schemas/json/layout/expression.schema.v1.json';
import layoutSchema from '../schemas/json/layout/layout.schema.v1.json';
import layoutSettingsSchema from '../schemas/json/layout/layoutSettings.schema.v1.json';
import numberFormatSchema from '../schemas/json/component/number-format.schema.v1.json';

describe('layout schemas', () => {
  it('contains all schemas needed to validate layouts', () => {
    expect(layoutSchema.$id).toBe('https://altinncdn.no/schemas/json/layout/layout.schema.v1.json');
    expect(layoutSettingsSchema.$id).toBe(
      'https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json',
    );
    expect(expressionSchema.$id).toBe(
      'https://altinncdn.no/schemas/json/layout/expression.schema.v1.json',
    );
    expect(numberFormatSchema.$id).toBe(
      'https://altinncdn.no/schemas/json/component/number-format.schema.v1.json',
    );
  });

  it('only permits externally configurable components', () => {
    const componentTypes = layoutSchema.definitions.AnyComponent.properties.type.enum;
    expect(componentTypes).toContain('Option');
    expect(componentTypes).not.toContain('LikertItem');
  });
});
