
import '@testing-library/jest-dom/extend-expect';
import 'jest';
import * as React from 'react';
import { render } from '@testing-library/react';
import { RepeatingGroupAddButton } from '../../../../src/features/form/components/RepeatingGroupAddButton';
import { ILayoutGroup } from '../../../../src/features/form/layout';
import { ITextResource } from '../../../../src/types';

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
        onClickAdd={() => {}}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onKeypressAdd={(event: React.KeyboardEvent<HTMLDivElement>) => {}}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
