import { ConfigGridProperties, type ConfigGridPropertiesProps } from './ConfigGridProperties';
import { componentMocks } from '../../../testing/componentMocks';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { cancelConfigAndVerify, openConfigAndVerify, saveConfigChanges } from './testConfigUtils';

describe('ConfigGridProperties', () => {
  const propertyKey = 'grid';
  it('should be able to toggle config for grid property', async () => {
    const user = userEvent.setup();
    renderConfigGridProperties();
    await openConfigAndVerify({ user, property: propertyKey });
    await cancelConfigAndVerify(user);
  });

  it('should call handleComponentUpdate when saving a new grid value', async () => {
    const user = userEvent.setup();
    const handleComponentUpdate = jest.fn();
    renderConfigGridProperties({ props: { handleComponentUpdate } });
    await openConfigAndVerify({ user, property: propertyKey });
    const switchDefaultGrid = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_grid_use_default'),
    });
    expect(switchDefaultGrid).toBeChecked();
    await user.click(switchDefaultGrid);
    expect(switchDefaultGrid).not.toBeChecked();

    await saveConfigChanges(user);
    expect(handleComponentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        grid: { xs: 12 },
      }),
    );
  });

  it('should call handleComponentUpdate when deleting grid value', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const componentWithGrid = {
      ...componentMocks.Input,
      grid: { xs: 6 as const, md: 4 as const },
    };

    const handleComponentUpdate = jest.fn();
    renderConfigGridProperties({ props: { component: componentWithGrid, handleComponentUpdate } });
    await openConfigAndVerify({ user, property: propertyKey });

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(deleteButton);
    expect(handleComponentUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({
        grid: expect.anything(),
      }),
    );
  });

  it('should keep latest component from parent when saving grid changes', async () => {
    const user = userEvent.setup();
    const handleComponentUpdate = jest.fn();
    const initialComponent = {
      ...componentMocks.Input,
      dataModelBindings: { simpleBinding: { field: 'oldField', dataType: 'oldType' } },
    };
    const { rerender } = render(
      <ConfigGridProperties
        component={initialComponent}
        handleComponentUpdate={handleComponentUpdate}
      />,
    );
    await openConfigAndVerify({ user, property: propertyKey });
    const updatedComponent = {
      ...componentMocks.Input,
      dataModelBindings: { simpleBinding: { field: 'newField', dataType: 'newType' } },
    };
    rerender(
      <ConfigGridProperties
        component={updatedComponent}
        handleComponentUpdate={handleComponentUpdate}
      />,
    );
    const switchDefaultGrid = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_grid_use_default'),
    });
    await user.click(switchDefaultGrid);
    await saveConfigChanges(user);
    expect(handleComponentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        dataModelBindings: { simpleBinding: { field: 'newField', dataType: 'newType' } },
        grid: { xs: 12 },
      }),
    );
  });

  it('should remove grid when user clears all grid values before saving', async () => {
    const user = userEvent.setup();
    const handleComponentUpdate = jest.fn();
    const componentWithGrid = {
      ...componentMocks.Input,
      grid: { xs: 6 as const },
    };
    renderConfigGridProperties({
      props: { component: componentWithGrid, handleComponentUpdate },
    });
    await openConfigAndVerify({ user, property: propertyKey });
    const switchDefaultGrid = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_grid_use_default'),
    });
    expect(switchDefaultGrid).not.toBeChecked();
    await user.click(switchDefaultGrid);
    expect(switchDefaultGrid).toBeChecked();
    await saveConfigChanges(user);
    expect(handleComponentUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({
        grid: expect.anything(),
      }),
    );
  });

  type RenderConfigGridPropertiesProps = {
    props?: Partial<ConfigGridPropertiesProps>;
  };

  const renderConfigGridProperties = ({ props }: RenderConfigGridPropertiesProps = {}) => {
    const defaultProps: ConfigGridPropertiesProps = {
      component: componentMocks.Input,
      handleComponentUpdate: jest.fn(),
    };
    return render(<ConfigGridProperties {...defaultProps} {...props} />);
  };
});
