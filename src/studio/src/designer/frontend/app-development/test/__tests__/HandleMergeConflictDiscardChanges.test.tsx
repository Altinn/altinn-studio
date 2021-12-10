import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as networking from 'app-shared/utils/networking';

import { HandleMergeConflictDiscardChanges } from '../../features/handleMergeConflict/components/HandleMergeConflictDiscardChanges';

describe('HandleMergeConflictDiscardChanges', () => {
  let mockClasses: any;
  let mockLanguage: any;
  let consoleError: any;

  beforeAll(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {
      return {};
    });
  });

  beforeEach(() => {
    mockClasses = {};
    mockLanguage = {};
  });

  it('should handle successfully returned data from API', async () => {
    const wrapper = mount(
      <HandleMergeConflictDiscardChanges
        classes={mockClasses}
        language={mockLanguage}
      />,
    );

    const instance = wrapper.instance() as HandleMergeConflictDiscardChanges;

    // Spies
    const spyOnDiscardChangesPopover = jest.spyOn(instance, 'discardChangesPopover');
    const spyOnDiscardChangesConfirmed = jest.spyOn(instance, 'discardChangesConfirmed');

    // Mocks
    const getStub = jest.fn();
    const mockGet = jest.spyOn(networking, 'get').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.resolve());

    // Expected no result from networking yet
    expect(instance.state.networkingRes).toEqual(null);

    // Expect discard button to exist
    expect(wrapper.exists('#discardMergeChangesBtn')).toEqual(true);

    // workaround, have to click twice the first time
    wrapper.find('button#discardMergeChangesBtn').simulate('click');
    // Click the discard button
    wrapper.find('button#discardMergeChangesBtn').simulate('click');
    expect(spyOnDiscardChangesPopover).toHaveBeenCalled();

    // Expect the button inside the popover to exist
    expect(wrapper.exists('#discardMergeChangesConfirmBtn')).toEqual(true);

    // Click the confirm button
    wrapper.find('button#discardMergeChangesConfirmBtn').simulate('click');

    // Expect functions to be called
    expect(spyOnDiscardChangesConfirmed).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalled();

    // Expect state to change
    expect(instance.state.popoverState.isLoading).toEqual(true);
    expect(instance.state.popoverState.shouldShowDoneIcon).toEqual(false);

    // Resolve mocked networking
    await Promise.resolve();

    // Expect state to change
    expect(instance.state.popoverState.isLoading).toEqual(false);
    expect(instance.state.popoverState.shouldShowDoneIcon).toEqual(true);
  });

  it('should handle unsuccessfully returned data from API', async () => {
    const wrapper = mount(
      <HandleMergeConflictDiscardChanges
        classes={mockClasses}
        language={mockLanguage}
      />,
    );

    const instance = wrapper.instance() as HandleMergeConflictDiscardChanges;

    // Spies
    const spyOnDiscardChangesPopover = jest.spyOn(instance, 'discardChangesPopover');
    const spyOnDiscardChangesConfirmed = jest.spyOn(instance, 'discardChangesConfirmed');

    // Mocks
    const getStub = jest.fn();
    const mockGet = jest.spyOn(networking, 'get').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.reject());

    // Expected no result from networking yet
    expect(instance.state.networkingRes).toEqual(null);

    // Expect discard button to exist
    expect(wrapper.exists('#discardMergeChangesBtn')).toEqual(true);

    // workaround, have to click twice the first time
    wrapper.find('button#discardMergeChangesBtn').simulate('click');
    // Click the discard button
    wrapper.find('button#discardMergeChangesBtn').simulate('click');
    expect(spyOnDiscardChangesPopover).toHaveBeenCalled();

    // Expect the button inside the popover to exist
    expect(wrapper.exists('#discardMergeChangesConfirmBtn')).toEqual(true);

    // Click the confirm button
    wrapper.find('button#discardMergeChangesConfirmBtn').simulate('click');

    // Expect functions to be called
    expect(spyOnDiscardChangesConfirmed).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalled();

    // Expect state to change
    expect(instance.state.popoverState.isLoading).toEqual(true);
    expect(instance.state.popoverState.shouldShowDoneIcon).toEqual(false);

    // Resolve mocked networking
    await Promise.resolve();

    // Expect state to change
    expect(instance.state.popoverState.isLoading).toEqual(false);
    expect(instance.state.popoverState.shouldShowDoneIcon).toEqual(false);
    expect(consoleError).toHaveBeenCalled();

  });

  it('should catch error from networked function', async () => {
    const wrapper = mount(
      <HandleMergeConflictDiscardChanges
        classes={mockClasses}
        language={mockLanguage}
      />,
    );

    const instance = wrapper.instance() as HandleMergeConflictDiscardChanges;

    // Spies
    const spyOnDiscardChangesPopover = jest.spyOn(instance, 'discardChangesPopover');
    const spyOnDiscardChangesConfirmed = jest.spyOn(instance, 'discardChangesConfirmed');

    // Mocks
    const mockError = Error('mocked error');
    const getStub = jest.fn();
    const mockGet = jest.spyOn(networking, 'get').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.reject(mockError));

    // Expected no result from networking yet
    expect(instance.state.networkingRes).toEqual(null);

    // Expect discard button to exist
    expect(wrapper.exists('#discardMergeChangesBtn')).toEqual(true);

    // workaround, have to click twice the first time
    wrapper.find('button#discardMergeChangesBtn').simulate('click');
    // Click the discard button
    wrapper.find('button#discardMergeChangesBtn').simulate('click');
    expect(spyOnDiscardChangesPopover).toHaveBeenCalled();

    // Expect the button inside the popover to exist
    expect(wrapper.exists('#discardMergeChangesConfirmBtn')).toEqual(true);

    // Click the confirm button
    wrapper.find('button#discardMergeChangesConfirmBtn').simulate('click');

    // Expect functions to be called
    expect(spyOnDiscardChangesConfirmed).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalled();

    // Resolve mocked networking
    await Promise.resolve();

    // Expect state to change
    expect(instance.state.popoverState.isLoading).toEqual(false);
    expect(instance.state.popoverState.shouldShowDoneIcon).toEqual(false);
    expect(instance.state.errorObj).toMatchObject(Error('mocked error'));
    expect(instance.state.networkingRes).toEqual('error');

    // Expect console.error to be called.
    expect(consoleError).toHaveBeenCalled();
  });

});
