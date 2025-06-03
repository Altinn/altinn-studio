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
  it('should call handleComponentUpdate with validFileEndings undefined when hasCustomFileEndings is false', async () => {
    const handleComponentUpdateMock = jest.fn();
    render({
      props: {
        component: {
          ...componentMocks.Input,
          hasCustomFileEndings: true,
        },
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    const user = userEvent.setup();
    const hasCustomFileEndingsSwitch = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.hasCustomFileEndings'),
    });
    expect(hasCustomFileEndingsSwitch).toBeChecked();
    await user.click(hasCustomFileEndingsSwitch);
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCustomFileEndings: false,
        validFileEndings: undefined,
      }),
    );
  });

  it('should call handleComponentUpdate with updated component when hasCustomFileEndings is true', async () => {
    const handleComponentUpdateMock = jest.fn();
    render({
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

  const render = ({
    props = {},
    queries = {},
  }: {
    props?: Partial<ConfigCustomFileEndingProps>;
    queries?: Partial<ServicesContextProps>;
  }) => {
    const { Input: inputComponent } = componentMocks;
    const defaultProps: ConfigCustomFileEndingProps = {
      component: inputComponent,
      hasCustomFileEndings: {
        default: true,
        description: 'hasCustomFileEndings',
      },
      handleComponentUpdate: jest.fn(),
    };
    return renderWithProviders(<ConfigCustomFileEnding {...defaultProps} {...props} />, {
      queries,
    });
  };
});
