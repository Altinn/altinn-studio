import * as React from 'react';
import { render } from '@testing-library/react';

import type { ILayoutGroup } from '../layout';
import type { ITextResource } from '../../../types';

import { RepeatingGroupAddButton } from './RepeatingGroupAddButton';

describe('components/base/InputComponent.tsx', () => {
  let mockContainer: ILayoutGroup;
  let mockLanguage: any;
  let mockTextResources: ITextResource[];

  beforeEach(() => {
    mockContainer = {
      children: [],
      id: 'mock-container',
      maxCount: 3,
      dataModelBindings: {
        group: 'group.field',
      },
      type: 'Group',
    };
    mockLanguage = {
      general: {
        add_new: 'Legg til',
      },
    };
    mockTextResources = [];
  });

  test('components/form/RepeatingGroupsAddButton -- should match snapshot', () => {
    const { asFragment } = render(
      <RepeatingGroupAddButton
        container={mockContainer}
        language={mockLanguage}
        textResources={mockTextResources}
        onClickAdd={jest.fn()}
        onKeypressAdd={jest.fn()}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
