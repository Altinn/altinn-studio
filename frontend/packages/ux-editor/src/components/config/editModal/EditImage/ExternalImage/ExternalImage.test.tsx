import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import type { ExternalImageProps } from '@altinn/ux-editor/components/config/editModal/EditImage/ExternalImage/ExternalImage';
import { ExternalImage } from '@altinn/ux-editor/components/config/editModal/EditImage/ExternalImage/ExternalImage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';

const existingImageUrl = undefined;
const onUrlChangeMock = jest.fn();
const onUrlDeleteMock = jest.fn();
const imageOriginsFromLibrary = false;

describe('ExternalImage', () => {
  afterEach(() => jest.clearAllMocks());
  it('shows input field by default when no url exists', () => {
    renderExternalImage();
    const inputUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    expect(inputUrlField).toBeInTheDocument();
  });
  it('shows conflictingImageSourceAlert when imageOriginsFromLibrary is true', () => {
    renderExternalImage({ imageOriginsFromLibrary: true });
    const conflictingImageSourceAlert = screen.getByText(
      textMock('ux_editor.properties_panel.images.conflicting_image_source_when_entering_url'),
    );
    expect(conflictingImageSourceAlert).toBeInTheDocument();
  });
  it('shows existing url in view mode if exist', () => {
    const existingUrl = 'someExistingUrl';
    renderExternalImage({ existingImageUrl: existingUrl });
    const existingUrlButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url') + ' ' + existingUrl,
    });
    expect(existingUrlButton).toBeInTheDocument();
  });
  it('shows "invalid url" error message by default if existing url is validated as invalid url', () => {
    const existingUrl = 'someExistingUrl';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData(
      [QueryKey.ImageUrlValidation, org, app, existingUrl],
      'NotValidUrl',
    );
    renderExternalImage({ existingImageUrl: existingUrl }, {}, queryClientMock);
    const invalidUrlErrorMessage = screen.getByText(
      textMock('ux_editor.properties_panel.images.invalid_external_url'),
    );
    expect(invalidUrlErrorMessage).toBeInTheDocument();
    expect(queriesMock.validateImageFromExternalUrl).toHaveBeenCalled();
    expect(queriesMock.validateImageFromExternalUrl).toHaveBeenCalledTimes(1);
  });
  it('shows "not an image" error message by default if existing url is validated as not an image', () => {
    const existingUrl = 'someExistingUrl';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData(
      [QueryKey.ImageUrlValidation, org, app, existingUrl],
      'NotAnImage',
    );
    renderExternalImage({ existingImageUrl: existingUrl }, {}, queryClientMock);
    const notAnImageErrorMessage = screen.getByText(
      textMock('ux_editor.properties_panel.images.invalid_external_url_not_an_image'),
    );
    expect(notAnImageErrorMessage).toBeInTheDocument();
    expect(queriesMock.validateImageFromExternalUrl).toHaveBeenCalled();
    expect(queriesMock.validateImageFromExternalUrl).toHaveBeenCalledTimes(1);
  });
  it('shows loading spinner when entering a new url that is being validated in backend', async () => {
    const user = userEvent.setup();
    renderExternalImage();
    const inputUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    await user.type(inputUrlField, 'someUrlToValidate');
    await waitFor(() => inputUrlField.blur());
    const validationSpinner = screen.getByText(
      textMock('ux_editor.properties_panel.images.validating_image_url_pending'),
    );
    expect(validationSpinner).toBeInTheDocument();
    expect(queriesMock.validateImageFromExternalUrl).toHaveBeenCalled();
    expect(queriesMock.validateImageFromExternalUrl).toHaveBeenCalledTimes(2); // one initial time and another after entering new url
  });
  it('shows "invalid url" error message when entering an invalid url', async () => {
    const user = userEvent.setup();
    const invalidUrl = 'invalidUrl';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData(
      [QueryKey.ImageUrlValidation, org, app, invalidUrl],
      'NotValidUrl',
    );
    renderExternalImage({}, {}, queryClientMock);
    const inputUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    await user.type(inputUrlField, invalidUrl);
    await waitFor(() => inputUrlField.blur());
    const invalidUrlErrorMessage = screen.getByText(
      textMock('ux_editor.properties_panel.images.invalid_external_url'),
    );
    expect(invalidUrlErrorMessage).toBeInTheDocument();
    expect(queriesMock.validateImageFromExternalUrl).toHaveBeenCalledTimes(2); // Remove this from test
  });
  it('shows "not an image" error message when entering a url that is not an image', async () => {
    const user = userEvent.setup();
    const notAnImageUrl = 'notAnImageUrl';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData(
      [QueryKey.ImageUrlValidation, org, app, notAnImageUrl],
      'NotAnImage',
    );
    renderExternalImage({}, {}, queryClientMock);
    const inputUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    await user.type(inputUrlField, notAnImageUrl);
    await waitFor(() => inputUrlField.blur());
    const invalidUrlErrorMessage = screen.getByText(
      textMock('ux_editor.properties_panel.images.invalid_external_url_not_an_image'),
    );
    expect(invalidUrlErrorMessage).toBeInTheDocument();
  });
  it('does not call onUrlChange when entering an invalid url', async () => {
    const user = userEvent.setup();
    const invalidUrl = 'invalidUrl';
    const validateImageFromExternalUrlMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve('NotAnImage'));
    renderExternalImage({}, { validateImageFromExternalUrl: validateImageFromExternalUrlMock });
    const inputUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    await user.type(inputUrlField, invalidUrl);
    await waitFor(() => inputUrlField.blur());
    expect(onUrlChangeMock).not.toHaveBeenCalled();
  });
  it('calls onUrlChange when entering a valid url', async () => {
    const user = userEvent.setup();
    renderExternalImage();
    const inputUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    await user.type(inputUrlField, 'someValidUrl');
    await waitFor(() => inputUrlField.blur());
    expect(onUrlChangeMock).toHaveBeenCalled();
  });
  it('sets url to view mode when entering a valid url', async () => {
    const user = userEvent.setup();
    const validUrl = 'someValidUrl';
    renderExternalImage();
    const inputUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    await user.type(inputUrlField, validUrl);
    await waitFor(() => inputUrlField.blur());
    const existingUrlButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url') + ' ' + validUrl,
    });
    expect(existingUrlButton).toBeInTheDocument();
  });
  it('calls onUrlDelete when entering an empty url', async () => {
    const user = userEvent.setup();
    renderExternalImage();
    const inputUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    await user.clear(inputUrlField);
    await waitFor(() => inputUrlField.blur());
    expect(onUrlDeleteMock).toHaveBeenCalledTimes(1);
    expect(onUrlDeleteMock).toHaveBeenCalledWith();
  });
  it('sets field to view mode with placeholder text when entering an empty url', async () => {
    const user = userEvent.setup();
    renderExternalImage();
    const inputUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    await user.clear(inputUrlField);
    await waitFor(() => inputUrlField.blur());
    const enterUrlButton = screen.getByRole('button', {
      name:
        textMock('ux_editor.properties_panel.images.enter_external_url') +
        ' ' +
        textMock('ux_editor.properties_panel.images.external_url_not_added'),
    });
    expect(enterUrlButton).toBeInTheDocument();
    const emptyUrlPlaceholder = screen.getByText(
      textMock('ux_editor.properties_panel.images.external_url_not_added'),
    );
    expect(emptyUrlPlaceholder).toBeInTheDocument();
  });
});

const defaultProps: ExternalImageProps = {
  existingImageUrl,
  onUrlChange: onUrlChangeMock,
  onUrlDelete: onUrlDeleteMock,
  imageOriginsFromLibrary,
};

const renderExternalImage = (
  props: Partial<ExternalImageProps> = {},
  queries: Partial<ServicesContextProps> = queriesMock,
  queryClient = createQueryClientMock(),
) => {
  renderWithProviders(<ExternalImage {...defaultProps} {...props} />, { queries, queryClient });
};
