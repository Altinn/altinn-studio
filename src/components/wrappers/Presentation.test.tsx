import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import axios from 'axios';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { partyMock } from 'src/__mocks__/partyMock';
import { PresentationComponent } from 'src/components/wrappers/Presentation';
import { renderWithProviders } from 'src/test/renderWithProviders';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { ProcessTaskType } from 'src/types';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { returnUrlToMessagebox } from 'src/utils/urls/urlHelper';
import type { IPresentationProvidedProps } from 'src/components/wrappers/Presentation';

jest.mock('axios');

function flushPromises() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

const user = userEvent.setup();

const stateWithErrorsAndWarnings = getInitialStateMock({
  formValidations: {
    validations: {
      FormLayout: {
        'mock-component-id': {
          simpleBinding: {
            errors: ['mock-error-message'],
            warnings: ['mock-warning-message'],
          },
        },
      },
    },
    invalidDataTypes: [],
    error: null,
  },
});

describe('Presentation', () => {
  it('should change window.location.href to query parameter returnUrl if valid URL', async () => {
    const returnUrl = 'foo';

    (axios.get as jest.Mock).mockResolvedValue({
      data: returnUrl,
      status: HttpStatusCodes.Ok,
    });

    Object.defineProperty(window, 'location', {
      value: {
        ...window,
        search: `?returnUrl=${returnUrl}`,
      },
      writable: true,
    });

    render({ type: ProcessTaskType.Data });

    expect(window.location.href).not.toEqual(returnUrl);

    const closeButton = screen.getByRole('button', {
      name: /Lukk skjema/i,
    });
    await user.click(closeButton);

    expect(window.location.href).toEqual(returnUrl);

    await flushPromises();
  });

  it('should change window.location.href to default messagebox url if query parameter returnUrl is not valid', async () => {
    const origin = 'https://local.altinn.cloud';
    const returnUrl = 'https://altinn.cloud.no';
    (axios.get as jest.Mock).mockRejectedValue({
      data: 'Error',
      status: HttpStatusCodes.BadRequest,
    });
    Object.defineProperty(window, 'location', {
      value: {
        ...window,
        origin,
        search: `?returnUrl=${returnUrl}`,
      },
      writable: true,
    });

    render({ type: ProcessTaskType.Data }, stateWithErrorsAndWarnings);

    expect(window.location.href).not.toEqual(returnUrlToMessagebox(origin, partyMock.partyId));

    const closeButton = screen.getByRole('button', {
      name: /lukk skjema/i,
    });
    await user.click(closeButton);

    expect(window.location.href).toEqual(returnUrlToMessagebox(origin, partyMock.partyId));

    await flushPromises();
  });

  it('should change window.location.href to default messagebox url if query parameter returnUrl is not found', async () => {
    const origin = 'https://local.altinn.cloud';
    Object.defineProperty(window, 'location', {
      value: {
        ...window,
        origin,
      },
      writable: true,
    });

    render({ type: ProcessTaskType.Data }, stateWithErrorsAndWarnings);

    expect(window.location.href).not.toEqual(returnUrlToMessagebox(origin, partyMock.partyId));

    const closeButton = screen.getByRole('button', {
      name: /lukk skjema/i,
    });
    await user.click(closeButton);

    expect(window.location.href).toEqual(returnUrlToMessagebox(origin, partyMock.partyId));

    await flushPromises();
  });

  it('should render children', () => {
    render({
      type: ProcessTaskType.Data,
      children: <div data-testid='child-component' />,
    });

    expect(screen.getByTestId('child-component')).toBeInTheDocument();
  });

  it('the background color should be greyLight if type is "ProcessTaskType.Data"', () => {
    render({ type: ProcessTaskType.Data });

    const appHeader = screen.getByTestId('AltinnAppHeader');

    expect(appHeader).toHaveStyle(`background-color: ${AltinnAppTheme.altinnPalette.primary.greyLight}`);
  });

  it('the background color should be lightGreen if type is "ProcessTaskType.Archived"', () => {
    render({ type: ProcessTaskType.Archived });

    const appHeader = screen.getByTestId('AltinnAppHeader');

    expect(appHeader).toHaveStyle(`background-color: ${AltinnAppTheme.altinnPalette.primary.greenLight}`);
  });
});

const render = (props: Partial<IPresentationProvidedProps> = {}, preloadedState: any = undefined) => {
  const allProps = {
    header: 'Header text',
    type: ProcessTaskType.Unknown,
    ...props,
  };

  renderWithProviders(<PresentationComponent {...allProps} />, { preloadedState });
};
