/* The test is not completed yet and will have commented code */

import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
// import { Provider } from 'react-redux';
// import configureStore from 'redux-mock-store';
// import * as networking from '../../shared/src/utils/networking';

import { HandleMergeConflictDiscardChanges } from '../src/features/handleMergeConflict/components/HandleMergeConflictDiscardChanges';

describe('HandleMergeConflictDiscardChanges', () => {
  let mockClasses: any;
  let mockLanguage: any;
  //let initialState: any;

  beforeEach(() => {
    mockClasses = {};
    mockLanguage = {};
    // initialState = {
    //   popoverState: {
    //     descriptionText: '',
    //     isLoading: false,
    //     shouldShowDoneIcon: false,
    //     btnText: 'OK',
    //     shouldShowCommitBox: false,
    //     btnMethod: '',
    //     btnCancelText: '',
    //   },
    // };
  });

  it('should verify something', () => {
    const wrapper = mount(
      <HandleMergeConflictDiscardChanges
        classes={mockClasses}
        language={mockLanguage}
      />,
    );

    const instance = wrapper.instance() as HandleMergeConflictDiscardChanges;
    const spy = jest.spyOn(instance, 'discardChangesPopover');

    expect(wrapper.exists('#discardMergeChangesBtn')).toEqual(true);
    // workaround
    wrapper.find('button#discardMergeChangesBtn').simulate('click');
    wrapper.find('button#discardMergeChangesBtn').simulate('click');
    expect(spy).toHaveBeenCalled();

    expect(wrapper.exists('#discardMergeChangesConfirmBtn')).toEqual(true);

  });
});
