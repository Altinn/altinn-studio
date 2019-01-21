import { mount } from 'enzyme';
import { Action } from 'history';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import * as networking from '../../shared/src/utils/networking';

import HandleMergeConflictDiscardChanges from '../src/features/handleMergeConflict/components/HandleMergeConflictDiscardChanges';

describe('HandleMergeConflictDiscardChanges', () => {
  let mockLanguage: any;
  let initialState: any;

  beforeEach(() => {
    mockLanguage = {};
    initialState = {
      popoverState: {
        descriptionText: '',
        isLoading: false,
        shouldShowDoneIcon: false,
        btnText: 'OK',
        shouldShowCommitBox: false,
        btnMethod: '',
        btnCancelText: '',
      },
    };
  });

  it('should verify something', () => {
    const mountedComponent = mount(
      <HandleMergeConflictDiscardChanges
        language={mockLanguage}
      />,
    );



  });
});
