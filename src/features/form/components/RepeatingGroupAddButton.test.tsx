import * as React from 'react';

import { render } from '@testing-library/react';

import { RepeatingGroupAddButton } from 'src/features/form/components/RepeatingGroupAddButton';
import type { ITextResource } from 'src/types';

describe('InputComponent', () => {
  let mockLanguage: any;
  let mockTextResources: ITextResource[];

  beforeEach(() => {
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
        language={mockLanguage}
        textResources={mockTextResources}
        onClickAdd={jest.fn()}
        onKeypressAdd={jest.fn()}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
