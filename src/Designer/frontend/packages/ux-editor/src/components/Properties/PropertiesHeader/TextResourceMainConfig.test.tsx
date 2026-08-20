import { TextResourceMainConfig } from './TextResourceMainConfig';
import { screen } from '@testing-library/react';
import { component1Mock } from '../../../testing/layoutMock';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

const mockHandleComponentUpdate = jest.fn();
const textResourceBindingKeys = ['title'];
const textResources: ITextResource[] = [
  { id: '1', value: 'Text 1' },
  { id: '2', value: 'Text 2' },
  { id: '3', value: 'Text 3' },
];

describe('TextBindingMainConfig', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns null if the component does not support a title binding', () => {
    renderTextMainConfig({});
    const wrapper = screen.getByTestId('component-wrapper');
    expect(wrapper).toBeEmptyDOMElement();
  });

  it('renders when titleKey is defined', () => {
    renderTextMainConfig({ textResourceBindingKeys });
    expect(textButton()).toBeInTheDocument();
  });

  it('updates text resource binding title when selecting a text resource id', async () => {
    const user = userEvent.setup();
    renderTextMainConfig({ textResourceBindingKeys });
    await user.click(textButton());

    const searchButton = screen.getByRole('tab', {
      name: textMock('ux_editor.text_resource_binding_search'),
    });
    await user.click(searchButton);

    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: textResources[1].id }),
    );
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));
    expect(mockHandleComponentUpdate).toHaveBeenCalledWith({
      ...component1Mock,
      textResourceBindings: {
        title: textResources[1].id,
      },
    });
  });

  it('removes text resource binding title when it is deleted', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    const component = {
      ...component1Mock,
      textResourceBindings: {
        title: '1',
      },
    };

    renderTextMainConfig({ component, textResourceBindingKeys });
    await user.click(textButton());

    const removeButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(removeButton);

    expect(mockHandleComponentUpdate).toHaveBeenCalledWith({
      ...component1Mock,
      textResourceBindings: {},
    });
  });
});

const textButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.modal_properties_textResourceBindings_title'),
  });

const renderTextMainConfig = ({
  component = component1Mock,
  textResourceBindingKeys: bindingKeys = undefined,
}) => {
  const queryClient = createQueryClientMock();
  const textResourcesList: ITextResources = {
    [DEFAULT_LANGUAGE]: textResources,
  };

  queryClient.setQueryData([QueryKey.TextResources, org, app], textResourcesList);

  return renderWithProviders(
    <div data-testid='component-wrapper'>
      <TextResourceMainConfig
        component={component}
        textResourceBindingKeys={bindingKeys || []}
        handleComponentChange={mockHandleComponentUpdate}
      />
    </div>,
    { queryClient },
  );
};
