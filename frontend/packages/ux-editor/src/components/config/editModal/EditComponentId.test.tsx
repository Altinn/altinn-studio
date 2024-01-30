import React from 'react';
import { act, screen, render } from '@testing-library/react';
import { renderWithMockStore } from '../../../testing/mocks';
import type { IEditComponentId } from './EditComponentId';
import { EditComponentId } from './EditComponentId';

import { textMock } from '../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';

const studioRender = (props: Partial<IEditComponentId>) => {
  const allProps: IEditComponentId = {
    handleComponentUpdate: jest.fn(),
    component: {
      id: 'test',
      type: ComponentType.Input,

      ...props.component,
    },
    helpText: 'test',
    ...props,
  };

  return render(<EditComponentId {...allProps} />);
};

describe('EditComponentId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render', () => {
    const { container } = studioRender({});
    expect(container).toBeInTheDocument();
  });
});
