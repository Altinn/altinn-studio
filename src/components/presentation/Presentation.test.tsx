import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import axios from 'axios';

import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { mockWindowWithSearch } from 'src/test/mockWindow';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { ProcessTaskType } from 'src/types';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { returnUrlToMessagebox } from 'src/utils/urls/urlHelper';
import type { IPresentationProvidedProps } from 'src/components/presentation/Presentation';
import type { IRuntimeState } from 'src/types';

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
  },
});

describe('Presentation', () => {
  it('should change window.location.href to query parameter returnUrl if valid URL', async () => {
    const returnUrl = 'foo';
    const { mockAssign, clearWindow } = mockWindowWithSearch({ search: `?returnUrl=${returnUrl}` });

    (axios.get as jest.Mock).mockResolvedValue({
      data: returnUrl,
      status: HttpStatusCodes.Ok,
    });

    await render({ type: ProcessTaskType.Data }, undefined, returnUrl);

    expect(window.location.href).not.toEqual(returnUrl);

    const closeButton = screen.getByRole('button', {
      name: /Lukk skjema/i,
    });
    await user.click(closeButton);

    expect(mockAssign).toHaveBeenCalledWith(returnUrl);

    await flushPromises();
    clearWindow();
  });

  it('should change window.location.href to default messagebox url if query parameter returnUrl is not valid', async () => {
    const origin = 'https://local.altinn.cloud';
    const returnUrl = 'https://altinn.cloud.no';
    const { mockAssign, clearWindow } = mockWindowWithSearch({ search: `?returnUrl=${returnUrl}`, origin });
    (axios.get as jest.Mock).mockRejectedValue({
      data: 'Error',
      status: HttpStatusCodes.BadRequest,
    });

    await render({ type: ProcessTaskType.Data }, stateWithErrorsAndWarnings);

    expect(window.location.href).not.toEqual(returnUrlToMessagebox(origin, getPartyMock().partyId));

    const closeButton = screen.getByRole('button', {
      name: /lukk skjema/i,
    });
    await user.click(closeButton);

    expect(mockAssign).toHaveBeenCalledWith(returnUrlToMessagebox(origin, getPartyMock().partyId));

    await flushPromises();
    clearWindow();
  });

  it('should change window.location.href to default messagebox url if query parameter returnUrl is not found', async () => {
    const origin = 'https://local.altinn.cloud';
    const { mockAssign, clearWindow } = mockWindowWithSearch({ origin });

    await render({ type: ProcessTaskType.Data }, stateWithErrorsAndWarnings);

    expect(window.location.href).not.toEqual(returnUrlToMessagebox(origin, getPartyMock().partyId));

    const closeButton = screen.getByRole('button', {
      name: /lukk skjema/i,
    });
    await user.click(closeButton);

    expect(mockAssign).toHaveBeenCalledWith(returnUrlToMessagebox(origin, getPartyMock().partyId));

    await flushPromises();
    clearWindow();
  });

  it('should render children', async () => {
    await render({
      type: ProcessTaskType.Data,
      children: <div data-testid='child-component' />,
    });

    expect(screen.getByTestId('child-component')).toBeInTheDocument();
  });

  it('the background color should be greyLight if type is "ProcessTaskType.Data"', async () => {
    await render({ type: ProcessTaskType.Data });

    const appHeader = screen.getByTestId('AltinnAppHeader');

    expect(appHeader).toHaveStyle(`background-color: ${AltinnAppTheme.altinnPalette.primary.greyLight}`);
  });

  it('the background color should be lightGreen if type is "ProcessTaskType.Archived"', async () => {
    await render({ type: ProcessTaskType.Archived });

    const appHeader = screen.getByTestId('AltinnAppHeader');

    expect(appHeader).toHaveStyle(`background-color: ${AltinnAppTheme.altinnPalette.primary.greenLight}`);
  });
});

const render = async (
  props: Partial<IPresentationProvidedProps> = {},
  reduxState?: IRuntimeState,
  returnUrl?: string,
) => {
  const allProps = {
    header: 'Header text',
    type: ProcessTaskType.Unknown,
    ...props,
  };

  await renderWithInstanceAndLayout({
    renderer: () => <PresentationComponent {...allProps} />,
    initialPage: `Task_1/1?returnUrl=${returnUrl}`,
    reduxState,
  });
};
