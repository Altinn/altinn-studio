import React from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { ServicesContextProvider } from './ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useQuery } from '@tanstack/react-query';

const wrapper = ({ children }) => (
  <ServicesContextProvider {...queriesMock}>
    {children}
  </ServicesContextProvider>
);

describe('ServicesContext', () => {
  it('displays a default error message if an API call fails', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    const { result } = renderHook(() => useQuery(['fetchData'],() => Promise.reject(), { retry: false }), { wrapper });

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(/general.error_message/)).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('displays a default error message if a component throws an error while rendering', () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    const ErrorComponent = () => { throw new Error('Intentional render error'); };
    render(<ErrorComponent />, { wrapper });

    expect(screen.getByText(/general.error_message/)).toBeInTheDocument();
    expect(screen.getByText(/general.try_again/)).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalled();
  });
});
