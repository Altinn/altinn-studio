import type { IEditFormComponentProps } from './EditFormComponent';
import { EditFormComponent } from './EditFormComponent';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../testing/mocks';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { componentMocks } from '../../testing/componentMocks';

// Mocks:
const mapSpecificContentId = 'map-specific-content';
jest.mock('./componentSpecificContent/Map/MapComponent', () => ({
  MapComponent: () => <div data-testid={mapSpecificContentId} />,
}));

describe('EditFormComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the registered component-specific content', async () => {
    await render({
      component: { ...componentMocks[ComponentType.Map] },
      editFormId: componentMocks[ComponentType.Map].id,
    });
    expect(await screen.findByTestId(mapSpecificContentId)).toBeInTheDocument();
  });

  it('does not render component-specific content for a generic component', async () => {
    await render();
    expect(screen.queryByTestId(mapSpecificContentId)).not.toBeInTheDocument();
  });
});

const defaultProps: IEditFormComponentProps = {
  editFormId: componentMocks[ComponentType.Input].id,
  component: componentMocks[ComponentType.Input],
  handleComponentUpdate: jest.fn(),
};

const render = async (props: Partial<IEditFormComponentProps> = {}) => {
  renderWithProviders(<EditFormComponent {...defaultProps} {...props} />);
};
