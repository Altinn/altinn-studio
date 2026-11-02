import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { App } from './App';
import { DISPLAY_NAME } from 'app-shared/constants';

jest.mock('app-shared/hooks/useListenToMergeConflictInRepo', () => ({
  useListenToMergeConflictInRepo: jest.fn(),
}));

describe('App', () => {
  afterEach(() => {
    document.title = '';
  });

  it('includes the app name in the document title', () => {
    renderApp('/test-org/first-app/overview');

    expect(document.title).toBe(`first-app - ${DISPLAY_NAME}`);
  });

  it('updates the document title when navigating to another app', () => {
    renderApp('/test-org/first-app/overview');

    fireEvent.click(screen.getByRole('button', { name: 'Navigate to another app' }));

    expect(document.title).toBe(`second-app - ${DISPLAY_NAME}`);
  });

  it('restores the default document title when navigating outside an app', () => {
    renderApp('/test-org/first-app/overview');

    fireEvent.click(screen.getByRole('button', { name: 'Navigate outside app' }));

    expect(document.title).toBe(DISPLAY_NAME);
  });
});

const TestPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <button type='button' onClick={() => navigate('/test-org/second-app/overview')}>
        Navigate to another app
      </button>
      <button type='button' onClick={() => navigate('/outside')}>
        Navigate outside app
      </button>
    </>
  );
};

const renderApp = (initialEntry: string) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path='/' element={<App />}>
          <Route path=':org/:app/overview' element={<TestPage />} />
          <Route path='outside' element={<div />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};
