import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigCustomFileEnding } from './ConfigCustomFileEnding';
import type { ConfigCustomFileEndingProps } from './ConfigCustomFileEnding';
import { componentMocks } from '../../../testing/componentMocks';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { getPropertyByRole } from './testConfigUtils';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';

describe('ConfigCustomFileEnding', () => {
  it('should show the switch for a broker file transfer', () => {
    renderConfigCustomFileEnding({
      props: {
        component: {
          id: 'brokerFileTransfer',
          type: ComponentType.BrokerFileTransfer,
          resourceId: 'broker-resource',
        },
      },
    });
    expect(getPropertyByRole('switch', 'hasCustomFileEndings')).toBeInTheDocument();
  });

  it('should call handleComponentUpdate with updated component', async () => {
    const handleComponentUpdateMock = vi.fn();
    renderConfigCustomFileEnding({
      props: {
        component: {
          ...componentMocks.FileUpload,
          hasCustomFileEndings: false,
        },
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    const user = userEvent.setup();
    const hasCustomFileEndingsSwitch = getPropertyByRole('switch', 'hasCustomFileEndings');
    expect(hasCustomFileEndingsSwitch).not.toBeChecked();
    await user.click(hasCustomFileEndingsSwitch);
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCustomFileEndings: true,
      }),
    );
  });

  it('should clear validFileEndings when hasCustomFileEndings is toggled to false', async () => {
    const handleComponentUpdateMock = vi.fn();
    renderConfigCustomFileEnding({
      props: {
        component: {
          ...componentMocks.FileUpload,
          hasCustomFileEndings: true,
          validFileEndings: ['.txt'],
        },
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    const user = userEvent.setup();
    const hasCustomFileEndingsSwitch = getPropertyByRole('switch', 'hasCustomFileEndings');
    expect(hasCustomFileEndingsSwitch).toBeChecked();
    await user.click(hasCustomFileEndingsSwitch);
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCustomFileEndings: false,
        validFileEndings: undefined,
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
    const { FileUpload: fileUploadComponent } = componentMocks;
    const defaultProps: ConfigCustomFileEndingProps = {
      component: fileUploadComponent,
      handleComponentUpdate: vi.fn(),
    };
    return renderWithProviders(<ConfigCustomFileEnding {...defaultProps} {...props} />, {
      queries,
    });
  };
});
