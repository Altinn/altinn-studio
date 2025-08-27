import React from 'react';
import type { IEditFormComponentProps } from './EditFormComponent';
import { EditFormComponent } from './EditFormComponent';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '../../testing/componentMocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { componentSchemaMocks } from '../../testing/componentSchemaMocks';

// Test data:
const srcValueLabel = 'Source';

// Mocks:
const imageSpecificContentId = 'image-specific-content';
jest.mock('./componentSpecificContent/Image/ImageComponent', () => ({
  ImageComponent: () => <div data-testid={imageSpecificContentId} />,
}));

describe('EditFormComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render Image component when component type is Image', async () => {
    await render({
      component: { ...componentMocks[ComponentType.Image] },
      editFormId: componentMocks[ComponentType.Image].id,
    });
    expect(await screen.findByTestId(imageSpecificContentId)).toBeInTheDocument();
  });

  it('should not render Image component when component type is not Image', async () => {
    await render();
    expect(screen.queryByLabelText(srcValueLabel)).not.toBeInTheDocument();
  });
});

const defaultProps: IEditFormComponentProps = {
  editFormId: componentMocks[ComponentType.Input].id,
  component: componentMocks[ComponentType.Input],
  handleComponentUpdate: jest.fn(),
};

const render = async (props: Partial<IEditFormComponentProps> = {}) => {
  const component = props.component ?? defaultProps.component;
  const componentType = component.type;

  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.FormComponent, componentMocks[componentType].type],
    componentSchemaMocks[componentMocks[componentType].type],
  );

  renderWithProviders(<EditFormComponent {...defaultProps} {...props} />, {
    queryClient,
  });
};
