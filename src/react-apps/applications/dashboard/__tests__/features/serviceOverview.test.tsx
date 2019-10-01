/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import {
  getListOfServicesExcludingCodelist,
} from '../../src/features/serviceOverview/servicesOverview';

describe('>>> features/serviceOverview', () => {

  it('+++ if there are no services getListOfServicesExcludingCodelist should return null', () => {
    const services = getListOfServicesExcludingCodelist(null);

    expect(services).toEqual(null);
  });

  it('+++ if there are services getListOfServicesExcludingCodelist should return services without codelists', () => {
    const serviceList = [
      {
        name: 'testService',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      },
      {
        name: 'NullSkatt',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      },
      {
        name: 'codelists',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      },
    ];
    const services = getListOfServicesExcludingCodelist(serviceList);
    const mockResult = [
      {
        name: 'testService',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      },
      {
        name: 'NullSkatt',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      },
    ];

    expect(services).toEqual(mockResult);
  });
});
