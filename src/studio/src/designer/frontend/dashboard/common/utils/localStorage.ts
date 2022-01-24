import { initialState as dashboardInitialState } from '../../resources/fetchDashboardResources/dashboardSlice';
import type { RootState } from 'app/store';

export const saveToLocalStorage = (state: RootState) => {
  try {
    const persist = {
      dashboard: {
        selectedContext: state.dashboard.selectedContext,
        repoRowsPerPage: state.dashboard.repoRowsPerPage,
      },
    };

    const serialized = JSON.stringify(persist);
    localStorage.setItem('dashboardStore', serialized);
  } catch (error) {
    console.error('Could not save dashboardState to localStorage', error);
  }
};

export const loadFromLocalStorage = () => {
  try {
    const persistedState = localStorage.getItem('dashboardStore');
    if (persistedState) {
      const parsed = {
        dashboard: {
          ...dashboardInitialState,
          ...JSON.parse(persistedState).dashboard,
        },
      };

      return parsed;
    }
  } catch (error) {
    console.error('Could not read dashboardState from localStorage', error);
  }
  return undefined;
};
