import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../testing/mocks';
import { ImageMainConfig } from './ImageMainConfig';
import type { FormItem } from '../../../../types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

const imageComponent: FormItem<ComponentType.Image> = {
  id: '0',
  type: ComponentType.Image,
  itemType: 'COMPONENT',
};

describe('ComponentMainConfig', () => {
  describe('Image', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render image config', async () => {
      render(imageComponent);
      expect(
        screen.getByText(textMock('ux_editor.properties_panel.texts.sub_title_images')),
      ).toBeInTheDocument();
    });

    it('should call handleComponentChange when changing target', async () => {
      const user = userEvent.setup();
      const handleComponentChange = jest.fn();
      render(imageComponent, handleComponentChange);
      await user.click(await uploadImageTab());
      await user.click(referenceUrlButton());
      await user.type(referenceUrlInput(), 't');
      await user.tab();
      expect(handleComponentChange).toHaveBeenCalledTimes(1);
    });
  });
});

const uploadImageTab = async () =>
  await screen.findByRole('tab', {
    name: textMock('ux_editor.properties_panel.images.enter_external_url_tab_title'),
  });
const referenceUrlButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.properties_panel.images.enter_external_url'),
  });
const referenceUrlInput = () =>
  screen.getByRole('textbox', {
    name: textMock('ux_editor.properties_panel.images.enter_external_url'),
  });

const render = (
  component: FormItem<ComponentType.Image>,
  handleComponentChange: (component: FormItem<ComponentType.Image>) => void = jest.fn(),
) => {
  const queryClient = createQueryClientMock();
  // Mock image file names data for Image component (StudioDialog renders immediately now)
  queryClient.setQueryData([QueryKey.ImageFileNames, org, app], []);

  renderWithProviders(
    <ImageMainConfig component={component} handleComponentChange={handleComponentChange} />,
    { queryClient },
  );
};
