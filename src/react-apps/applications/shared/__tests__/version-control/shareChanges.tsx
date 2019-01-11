import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import ShareChangesComponent from '../../src/version-control/shareChanges';

jest.mock('react-truncate-markup');

describe('>>> components/base/shareChanges.tsx --- Snapshot', () => {
  let mockShareChanges: any;
  let mockChangesInLocalRepo: boolean;
  let mockMoreThanAnHourSinceLastPush: boolean;
  let mockHasPushRight: boolean;
  let mockHasMergeConflict: boolean;
  let mockLanguage: any;

  beforeEach(() => {
    mockShareChanges = jest.fn();
    mockChangesInLocalRepo = true;
    mockMoreThanAnHourSinceLastPush = true;
    mockHasPushRight = true;
    mockHasMergeConflict = false;
    mockLanguage = {};
  });

  it('+++ Should match snapshot when its more than an hour since last push and there are changes in the repo', () => {
    const rendered = renderer.create(
      <ShareChangesComponent
        language={mockLanguage}
        shareChanges={mockShareChanges}
        changesInLocalRepo={mockChangesInLocalRepo}
        moreThanAnHourSinceLastPush={mockMoreThanAnHourSinceLastPush}
        hasPushRight={mockHasPushRight}
        hasMergeConflict={mockHasMergeConflict}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should match snapshot when its less than an hour since last push and there are changes in the repo', () => {
    mockMoreThanAnHourSinceLastPush = false;
    const rendered = renderer.create(
      <ShareChangesComponent
        language={mockLanguage}
        shareChanges={mockShareChanges}
        changesInLocalRepo={mockChangesInLocalRepo}
        moreThanAnHourSinceLastPush={mockMoreThanAnHourSinceLastPush}
        hasPushRight={mockHasPushRight}
        hasMergeConflict={mockHasMergeConflict}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should match snapshot when user only has read access to service', () => {
    mockHasPushRight = false;
    const rendered = renderer.create(
      <ShareChangesComponent
        language={mockLanguage}
        shareChanges={mockShareChanges}
        changesInLocalRepo={mockChangesInLocalRepo}
        moreThanAnHourSinceLastPush={mockMoreThanAnHourSinceLastPush}
        hasPushRight={mockHasPushRight}
        hasMergeConflict={mockHasMergeConflict}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should match snapshot when user has no changes in local repo', () => {
    mockChangesInLocalRepo = false;
    const rendered = renderer.create(
      <ShareChangesComponent
        language={mockLanguage}
        shareChanges={mockShareChanges}
        changesInLocalRepo={mockChangesInLocalRepo}
        moreThanAnHourSinceLastPush={mockMoreThanAnHourSinceLastPush}
        hasPushRight={mockHasPushRight}
        hasMergeConflict={mockHasMergeConflict}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should match snapshot when user has a mergeconflict', () => {
    mockHasMergeConflict = true;
    const rendered = renderer.create(
      <ShareChangesComponent
        language={mockLanguage}
        shareChanges={mockShareChanges}
        changesInLocalRepo={mockChangesInLocalRepo}
        moreThanAnHourSinceLastPush={mockMoreThanAnHourSinceLastPush}
        hasPushRight={mockHasPushRight}
        hasMergeConflict={mockHasMergeConflict}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should call mock function when changes in local repo on click button', () => {
    const shareChangesComp = mount(
      <ShareChangesComponent
        language={mockLanguage}
        shareChanges={mockShareChanges}
        changesInLocalRepo={mockChangesInLocalRepo}
        moreThanAnHourSinceLastPush={mockMoreThanAnHourSinceLastPush}
        hasPushRight={mockHasPushRight}
        hasMergeConflict={mockHasMergeConflict}
      />,
    );
    shareChangesComp.find('button').simulate('click');
    expect(mockShareChanges).toHaveBeenCalled();
  });

  it('+++ Should not call mock function when no changes in local repo on click button', () => {
    mockChangesInLocalRepo = false;
    const shareChangesComp = mount(
      <ShareChangesComponent
        language={mockLanguage}
        shareChanges={mockShareChanges}
        changesInLocalRepo={mockChangesInLocalRepo}
        moreThanAnHourSinceLastPush={mockMoreThanAnHourSinceLastPush}
        hasPushRight={mockHasPushRight}
        hasMergeConflict={mockHasMergeConflict}
      />,
    );
    shareChangesComp.find('button').simulate('click');
    expect(mockShareChanges).toBeCalledTimes(0);
  });
});
