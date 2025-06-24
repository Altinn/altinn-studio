import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigCustomFileEnding } from './ConfigCustomFileEnding';
import type { ConfigCustomFileEndingProps } from './ConfigCustomFileEnding';
import { componentMocks } from '../../../testing/componentMocks';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

describe('ConfigCustomFileEnding', () => {
  it('should call handleComponentUpdate with updated component', async () => {
    const handleComponentUpdateMock = jest.fn();
    renderConfigCustomFileEnding({
      props: {
        component: {
          ...componentMocks.Input,
          hasCustomFileEndings: false,
        },
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    const user = userEvent.setup();
    const hasCustomFileEndingsSwitch = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.hasCustomFileEndings'),
    });
    expect(hasCustomFileEndingsSwitch).not.toBeChecked();
    await user.click(hasCustomFileEndingsSwitch);
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCustomFileEndings: true,
      }),
    );
  });

  const renderConfigCustomFileEnding = ({
    props = {},
    queries = {},
  }: {
    props?: Partial<ConfigCustomFileEndingProps>;
    queries?: Partial<ServicesContextProps>;
  }) => {
    const { Input: inputComponent } = componentMocks;
    const defaultProps: ConfigCustomFileEndingProps = {
      component: inputComponent,
      handleComponentUpdate: jest.fn(),
    };
    return renderWithProviders(<ConfigCustomFileEnding {...defaultProps} {...props} />, {
      queries,
    });
  };
});
