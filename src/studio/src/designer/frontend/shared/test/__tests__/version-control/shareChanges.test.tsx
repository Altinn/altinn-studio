import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import ShareChangesComponent from '../../../version-control/shareChanges';

jest.mock('react-truncate-markup');

describe('>>> components/base/shareChanges.tsx --- Snapshot', () => {
  let mockShareChanges: any;
  let mockChangesInLocalRepo: boolean;
  let mockHasPushRight: boolean;
  let mockHasMergeConflict: boolean;
  let mockLanguage: any;

  beforeEach(() => {
    mockShareChanges = jest.fn();
    mockChangesInLocalRepo = true;
    mockHasPushRight = true;
    mockHasMergeConflict = false;
    mockLanguage = {};
  });

  it('+++ Should call mock function when changes in local repo on click button', () => {
    const shareChangesComp = mount(
      <ShareChangesComponent
        language={mockLanguage}
        shareChanges={mockShareChanges}
        changesInLocalRepo={mockChangesInLocalRepo}
        hasPushRight={mockHasPushRight}
        hasMergeConflict={mockHasMergeConflict}
      />,
    );
    shareChangesComp.find('button').simulate('click');
    expect(mockShareChanges).toHaveBeenCalled();
  });
});
