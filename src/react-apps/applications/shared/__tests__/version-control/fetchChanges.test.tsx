import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import FetchChangesComponenet from '../../src/version-control/fetchChanges';

jest.mock('react-truncate-markup');

describe('>>> components/base/fetchChanges.tsx --- Snapshot', () => {
  let mockFetchChanges: any;
  let mockChangesInMaster: boolean;
  let mockLanguage: any;

  beforeEach(() => {
    mockFetchChanges = jest.fn();
    mockChangesInMaster = true;
    mockLanguage = {};
  });

  it('+++ Should call mock function when changes in local repo on click button', () => {
    const fetchChangesComp = mount(
      <FetchChangesComponenet
        language={mockLanguage}
        fetchChanges={mockFetchChanges}
        changesInMaster={mockChangesInMaster}
      />,
    );
    fetchChangesComp.find('button').simulate('click');
    expect(mockFetchChanges).toHaveBeenCalled();
  });
});
