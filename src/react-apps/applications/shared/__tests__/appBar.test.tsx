// tslint:disable: max-line-length
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AppBarComponent from '../src/navigation/main-header/appBar';
import altinnTheme from '../src/theme/altinnStudioTheme';

import * as AppBarConfig from '../src/navigation/main-header/appBarConfig';

describe('AppBarComponent - src/navigation/main-header/appBar', () => {


  describe('When using AppBarConfig', () => {
    let app: any;
    const mockOrg: string = 'mock-org';
    const mockService: string = 'mock-service';
    const mockShowSubheader: boolean = true;

    const theme = createMuiTheme(altinnTheme);

    const tabletWidth: number = 1024;
    const tabletHeight: number = 768;

    window.resizeTo(tabletWidth, tabletHeight);

    AppBarConfig.menu.map((entry) => {
      it(`should render ${entry.key}`, () => {
        app = mount(
          <MemoryRouter>
            <MuiThemeProvider theme={theme}>
              <AppBarComponent
                org={mockOrg}
                service={mockService}
                showBreadcrumbOnTablet={true}
                showSubHeader={mockShowSubheader}
                activeSubHeaderSelection={entry.activeSubHeaderSelection}
              />
            </MuiThemeProvider>
          </MemoryRouter>, { attachTo: document.getElementById('root') },
        );

        expect(app.find('WithStyles(AppBarComponent)').prop('activeSubHeaderSelection')).toEqual(entry.activeSubHeaderSelection);
      });
    });
  });

});
