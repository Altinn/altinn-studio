import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { ArrayRestrictions } from './ArrayRestrictions';
import { ArrRestrictionKeys } from '@altinn/schema-model';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

// Test data:
const onChangeRestrictionValueMock = jest.fn();
const pathMock = '#/properties/xxsfds';

const render = (props: Partial<RestrictionItemProps> = {}) => {
  const allProps: RestrictionItemProps = {
    path: pathMock,
    readonly: false,
    restrictions: [],
    onChangeRestrictions: jest.fn(),
    onChangeRestrictionValue: onChangeRestrictionValueMock,
    ...props,
  };
  return rtlRender(<ArrayRestrictions {...allProps} />);
};


describe('ArrayRestrictions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('ArrayRestrictions should render correctly', async () => {
    render();
    Object.values(ArrRestrictionKeys).forEach((key) => {
      expect(screen.getByLabelText(textMock('schema_editor.' + key))).toBeDefined();
    });
  });

  it('should render minItems as a number field', async () => {
    const props = {
      restrictions: {
        minItems: '1',
      },
    };
    render(props);
    const minItems = screen.getByLabelText(textMock('schema_editor.' + ArrRestrictionKeys.minItems));
    userEvent.type(minItems, 'test 2');
    await waitFor(() =>
      expect(onChangeRestrictionValueMock).toHaveBeenCalledWith(pathMock, ArrRestrictionKeys.minItems, '12')
    );
  });

  it('should render maxItems as a number field', async () => {
    const props = {
      restrictions: {
        maxItems: '1',
      },
    };
    render(props);
    const maxItems = screen.getByLabelText(textMock('schema_editor.' + ArrRestrictionKeys.maxItems));
    userEvent.type(maxItems, 'test 2');
    await waitFor(() =>
      expect(onChangeRestrictionValueMock).toHaveBeenCalledWith(pathMock, ArrRestrictionKeys.maxItems, '12')
    );
  });

  it('should render uniqueItems as a checkbox', async () => {
    const props = {
      restrictions: {
        uniqueItems: false,
      },
    };
    render(props);
    const uniqueItems = screen.getByLabelText(textMock('schema_editor.' + ArrRestrictionKeys.uniqueItems));
    userEvent.click(uniqueItems);
    await waitFor(() =>
      expect(onChangeRestrictionValueMock).toHaveBeenCalledWith(pathMock, ArrRestrictionKeys.uniqueItems, true)
    );
  });
});
