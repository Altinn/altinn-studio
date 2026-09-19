import { renderWithProviders } from '../../../testing/mocks';
import { ConfigCustomFileEnding } from './ConfigCustomFileEnding';
import type { ConfigCustomFileEndingProps } from './ConfigCustomFileEnding';
import { componentMocks } from '../../../testing/componentMocks';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { getPropertyByRole } from './testConfigUtils';

describe('ConfigCustomFileEnding', () => {
  it('should call handleComponentUpdate with updated component', async () => {
    const handleComponentUpdateMock = jest.fn();
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
    const handleComponentUpdateMock = jest.fn();
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
      handleComponentUpdate: jest.fn(),
    };
    return renderWithProviders(<ConfigCustomFileEnding {...defaultProps} {...props} />, {
      queries,
    });
  };
});
