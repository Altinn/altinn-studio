import * as React from 'react';

import { render } from '@testing-library/react';

import { RepeatingGroupAddButton } from 'src/features/form/components/RepeatingGroupAddButton';
import type { ILayoutGroup } from 'src/features/form/layout';
import type { ITextResource } from 'src/types';

describe('InputComponent', () => {
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

  test('RepeatingGroupsAddButton', () => {
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
