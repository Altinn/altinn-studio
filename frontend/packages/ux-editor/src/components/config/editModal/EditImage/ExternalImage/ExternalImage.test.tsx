import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { renderWithProviders } from '../../../../../testing/mocks';
import type { ExternalImageProps } from './ExternalImage';
import { ExternalImage } from './ExternalImage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import type { ExternalImageUrlValidationResponse } from 'app-shared/types/api/ExternalImageUrlValidationResponse';

const onUrlChangeMock = jest.fn();
const onUrlDeleteMock = jest.fn();
const imageOriginsFromLibrary = false;

describe('ExternalImage', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows button to add url, with label as text content, by default when no url exists', () => {
    renderExternalImage();
    const urlButton = getUrlButton();
    expect(urlButton).toBeInTheDocument();
    expect(urlButton).toHaveTextContent(
      textMock('ux_editor.properties_panel.images.enter_external_url'),
    );
  });

  it('shows button to add url by default when no url exists', () => {
    const existingImageUrl = 'existingImageUrl';
    renderExternalImage({ existingImageUrl });
    const urlButton = getUrlButton();
    expect(urlButton).toBeInTheDocument();
    expect(urlButton).toHaveTextContent(existingImageUrl);
  });

  it('shows conflictingImageSourceAlert when imageOriginsFromLibrary is true', () => {
    renderExternalImage({ imageOriginsFromLibrary: true });
    const conflictingImageSourceAlert = screen.getByText(
      textMock('ux_editor.properties_panel.images.conflicting_image_source_when_entering_url'),
    );
    expect(conflictingImageSourceAlert).toBeInTheDocument();
  });

  it('shows "invalid url" error message by default if existing url is validated as invalid url', () => {
    const existingUrl = 'someExistingUrl';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData(
      [QueryKey.ImageUrlValidation, org, app, existingUrl],
      'NotValidUrl' satisfies ExternalImageUrlValidationResponse,
    );
    renderExternalImage({ existingImageUrl: existingUrl }, {}, queryClientMock);
    const invalidUrlErrorMessage = getInvalidUrlErrorMessage();
    expect(invalidUrlErrorMessage).toBeInTheDocument();
  });

  it('shows "not an image" error message by default if existing url is validated as not an image', () => {
    const existingUrl = 'someExistingUrl';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData(
      [QueryKey.ImageUrlValidation, org, app, existingUrl],
      'NotAnImage' satisfies ExternalImageUrlValidationResponse,
    );
    renderExternalImage({ existingImageUrl: existingUrl }, {}, queryClientMock);
    const notAnImageErrorMessage = getNotAnImageErrorMessage();
    expect(notAnImageErrorMessage).toBeInTheDocument();
  });

  it('shows loading spinner when entering a new url that is being validated in backend', async () => {
    const user = userEvent.setup();
    renderExternalImage();
    await inputUrlInField(user, 'someUrlToValidate');
    const validationSpinner = getValidationSpinner();
    expect(validationSpinner).toBeInTheDocument();
    expect(queriesMock.validateImageFromExternalUrl).toHaveBeenCalledTimes(1);
  });

  it('shows "invalid url" error message when entering an invalid url', async () => {
    const user = userEvent.setup();
    const invalidUrl = 'invalidUrl';
    const validateImageFromExternalUrlMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve('NotValidUrl'));
    renderExternalImage({}, { validateImageFromExternalUrl: validateImageFromExternalUrlMock });
    await inputUrlInField(user, invalidUrl);
    await waitForElementToBeRemoved(() => getValidationSpinner());
    const invalidUrlErrorMessage = getInvalidUrlErrorMessage();
    expect(invalidUrlErrorMessage).toBeInTheDocument();
  });

  it('shows "not an image" error message when entering a url that is not an image', async () => {
    const user = userEvent.setup();
    const notAnImageUrl = 'notAnImageUrl';
    const validateImageFromExternalUrlMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve('NotAnImage'));
    renderExternalImage({}, { validateImageFromExternalUrl: validateImageFromExternalUrlMock });
    await inputUrlInField(user, notAnImageUrl);
    await waitForElementToBeRemoved(() => getValidationSpinner());
    const invalidUrlErrorMessage = getNotAnImageErrorMessage();
    expect(invalidUrlErrorMessage).toBeInTheDocument();
  });

  it('does not call onUrlChange when entering an invalid url', async () => {
    const user = userEvent.setup();
    const invalidUrl = 'invalidUrl';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData(
      [QueryKey.ImageUrlValidation, org, app, invalidUrl],
      'NotValidUrl' satisfies ExternalImageUrlValidationResponse,
    );
    renderExternalImage({}, {}, queryClientMock);
    await inputUrlInField(user, invalidUrl);
    expect(onUrlChangeMock).not.toHaveBeenCalled();
  });

  it('calls onUrlChange when entering a valid url', async () => {
    const user = userEvent.setup();
    const validImageUrl = 'validImageUrl';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.ImageUrlValidation, org, app, validImageUrl], 'Ok');
    renderExternalImage({}, {}, queryClientMock);
    await inputUrlInField(user, validImageUrl);
    expect(onUrlChangeMock).toHaveBeenCalled();
  });

  it('calls onUrlChange when entering a valid url after entering an invalid one', async () => {
    const user = userEvent.setup();
    const invalidUrl = 'invalidUrl';
    const validImageUrl = 'validImageUrl';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData(
      [QueryKey.ImageUrlValidation, org, app, validImageUrl],
      'Ok' satisfies ExternalImageUrlValidationResponse,
    );
    queryClientMock.setQueryData(
      [QueryKey.ImageUrlValidation, org, app, invalidUrl],
      'NotAnImage' satisfies ExternalImageUrlValidationResponse,
    );
    renderExternalImage({}, {}, queryClientMock);
    // Entering invalid url
    await inputUrlInField(user, invalidUrl);
    // Entering valid url
    await inputUrlInField(user, validImageUrl);
    expect(onUrlChangeMock).toHaveBeenCalledTimes(1);
  });

  it('sets url to view mode when entering a valid url', async () => {
    const user = userEvent.setup();
    const validUrl = 'someValidUrl';
    renderExternalImage();
    await inputUrlInField(user, validUrl);
    const existingUrlButton = getUrlButton();
    expect(existingUrlButton).toBeInTheDocument();
    expect(existingUrlButton).toHaveTextContent(validUrl);
  });

  it('calls onUrlDelete when entering an empty url if there was an original url', async () => {
    const user = userEvent.setup();
    const existingUrl = 'someExistingUrl';
    renderExternalImage({ existingImageUrl: existingUrl });
    await inputUrlInField(user, undefined);
    expect(onUrlDeleteMock).toHaveBeenCalledTimes(1);
    expect(onUrlDeleteMock).toHaveBeenCalledWith();
  });

  it('does not call onUrlDelete when entering an empty url if there was non original url', async () => {
    const user = userEvent.setup();
    renderExternalImage();
    await inputUrlInField(user, undefined);
    expect(onUrlDeleteMock).not.toHaveBeenCalled();
  });

  it('does not call onUrlDelete when entering same as original url', async () => {
    const user = userEvent.setup();
    const existingUrl = 'someExistingUrl';
    renderExternalImage({ existingImageUrl: existingUrl });
    await inputUrlInField(user, existingUrl);
    expect(onUrlDeleteMock).not.toHaveBeenCalled();
  });

  it('should show error if validation failed', async () => {
    const user = userEvent.setup();
    const someUrl = 'someUrl';
    const validateImageFromExternalUrlMock = jest.fn().mockImplementation(() => Promise.reject());
    renderExternalImage({}, { validateImageFromExternalUrl: validateImageFromExternalUrlMock });
    await inputUrlInField(user, someUrl);
    await waitForElementToBeRemoved(() => getValidationSpinner());
    const errorMessage = screen.getByText(
      textMock('ux_editor.properties_panel.images.validating_image_url_error'),
    );
    expect(errorMessage).toBeInTheDocument();
  });
});

const getValidationSpinner = () =>
  screen.queryByText(textMock('ux_editor.properties_panel.images.validating_image_url_pending'));

const getInputUrlField = () =>
  screen.getByRole('textbox', {
    name: textMock('ux_editor.properties_panel.images.enter_external_url'),
  });

const getInvalidUrlErrorMessage = () =>
  screen.getByText(textMock('ux_editor.properties_panel.images.invalid_external_url'));

const getNotAnImageErrorMessage = () =>
  screen.getByText(textMock('ux_editor.properties_panel.images.invalid_external_url_not_an_image'));

const getUrlButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.properties_panel.images.enter_external_url'),
  });

const inputUrlInField = async (user: UserEvent, url: string) => {
  await user.click(getUrlButton());
  const inputUrlField = getInputUrlField();
  await user.clear(inputUrlField);
  if (url) await user.type(inputUrlField, url);
  await waitFor(() => inputUrlField.blur());
};

const defaultProps: ExternalImageProps = {
  existingImageUrl: undefined,
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
