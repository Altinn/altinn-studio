import axios from 'axios';
import React from 'react';
import { getInitialStateMock } from '../../../__mocks__/mocks';
import { partyMock } from '../../../__mocks__/partyMock';
import { AltinnAppTheme, returnUrlToMessagebox } from '../../../../shared/src';
import { HttpStatusCodes } from 'src/utils/networking';
import type { IPresentationProvidedProps } from './Presentation';
import { ProcessTaskType } from 'src/types';
import Presentation from './Presentation';
import { renderWithProviders } from '../../../testUtils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    invalidDataTypes: null,
    error: null,
    currentSingleFieldValidation: null,
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
      name: /general\.close_schema/i,
    });
    await user.click(closeButton);

    expect(window.location.href).toEqual(returnUrl);

    await flushPromises();
  });

  it('should change window.location.href to default messagebox url if query parameter returnUrl is not valid', async () => {
    const origin = 'https://altinn3local.no';
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

    expect(window.location.href).not.toEqual(
      returnUrlToMessagebox(origin, partyMock.partyId),
    );

    const closeButton = screen.getByRole('button', {
      name: /lukk skjema/i,
    });
    await user.click(closeButton);

    expect(window.location.href).toEqual(
      returnUrlToMessagebox(origin, partyMock.partyId),
    );

    await flushPromises();
  });

  it('should change window.location.href to default messagebox url if query parameter returnUrl is not found', async () => {
    const origin = 'https://altinn3local.no';
    Object.defineProperty(window, 'location', {
      value: {
        ...window,
        origin,
      },
      writable: true,
    });

    render({ type: ProcessTaskType.Data }, stateWithErrorsAndWarnings);

    expect(window.location.href).not.toEqual(
      returnUrlToMessagebox(origin, partyMock.partyId),
    );

    const closeButton = screen.getByRole('button', {
      name: /lukk skjema/i,
    });
    await user.click(closeButton);

    expect(window.location.href).toEqual(
      returnUrlToMessagebox(origin, partyMock.partyId),
    );

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

    expect(appHeader).toHaveStyle(
      `background-color: ${AltinnAppTheme.altinnPalette.primary.greyLight}`,
    );
  });

  it('the background color should be lightGreen if type is "ProcessTaskType.Archived"', () => {
    render({ type: ProcessTaskType.Archived });

    const appHeader = screen.getByTestId('AltinnAppHeader');

    expect(appHeader).toHaveStyle(
      `background-color: ${AltinnAppTheme.altinnPalette.primary.greenLight}`,
    );
  });

  it('should map validations if there are any and create error report', () => {
    render({ type: ProcessTaskType.Data }, stateWithErrorsAndWarnings);

    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
  });

  it('should hide error report when there are no validation errors', () => {
    render({ type: ProcessTaskType.Data });

    expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
  });
});

const render = (
  props: Partial<IPresentationProvidedProps> = {},
  preloadedState = undefined,
) => {
  const allProps = {
    header: 'Header text',
    type: ProcessTaskType.Unknown,
    ...props,
  };

  renderWithProviders(<Presentation {...allProps} />, { preloadedState });
};
