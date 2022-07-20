import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import {
  applicationMetadataSelector,
  cleanLayout,
  fetchLayoutSaga,
  instanceSelector,
  layoutSetsSelector,
} from 'src/features/form/layout/fetch/fetchFormLayoutSagas';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import * as networking from 'src/utils/networking';
import type {
  ILayoutCompFileUploadWithTag,
  ILayoutCompSummary,
  ILayoutGroup,
} from 'src/features/form/layout';

import type { IApplication, IInstance } from 'altinn-shared/types';

describe('fetchFormLayoutSagas', () => {
  describe('cleanLayout', () => {
    it('should convert incorrectly cased types to the correct case', () => {
      expect(
        cleanLayout([
          { type: 'group' } as any as ILayoutGroup,
          { type: 'sUMMARY' } as any as ILayoutCompSummary,
          { type: 'FileuploadwithTAG' } as any as ILayoutCompFileUploadWithTag,
          { type: 'ComponentThatDoesNotEXIST' } as any,
        ]),
      ).toEqual([
        { type: 'Group' },
        { type: 'Summary' },
        { type: 'FileUploadWithTag' },
        { type: 'ComponentThatDoesNotEXIST' },
      ]);
    });
  });

  describe('fetchLayoutSaga', () => {
    const instance = {
      id: 'some-instance-id',
    } as IInstance;
    const application = {
      id: 'someOrg/someApp',
    } as IApplication;
    const mockResponse = {
      page1: {
        data: {
          layout: [],
        },
      },
    };
    const mockResponseTwoLayouts = {
      ...mockResponse,
      page2: {
        data: {
          layout: [],
        },
      },
    };

    it('should call relevant actions when layout is fetched successfully', () => {
      jest.spyOn(networking, 'get').mockResolvedValue(mockResponse);

      return expectSaga(fetchLayoutSaga)
        .provide([
          [select(layoutSetsSelector), undefined],
          [select(instanceSelector), instance],
          [select(applicationMetadataSelector), application],
        ])
        .put(FormLayoutActions.setCurrentViewCacheKey({ key: instance.id }))
        .put(
          FormLayoutActions.fetchFulfilled({
            layouts: { page1: [] },
            navigationConfig: { page1: undefined },
          }),
        )
        .put(FormLayoutActions.updateAutoSave({ autoSave: undefined }))
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page1',
            skipPageCaching: true,
          }),
        )
        .run();
    });

    it('should call fetchRejected when fetching layout fails', () => {
      jest.spyOn(networking, 'get').mockRejectedValue(new Error('some error'));

      return expectSaga(fetchLayoutSaga)
        .provide([
          [select(layoutSetsSelector), undefined],
          [select(instanceSelector), instance],
          [select(applicationMetadataSelector), application],
        ])
        .put(
          FormLayoutActions.fetchRejected({
            error: new Error('some error'),
          }),
        )
        .run();
    });

    it('should set current view to cached key if key exists in fetched layout', () => {
      jest.spyOn(networking, 'get').mockResolvedValue(mockResponseTwoLayouts);
      jest.spyOn(window.localStorage.__proto__, 'getItem');
      window.localStorage.__proto__.getItem = jest
        .fn()
        .mockReturnValue('page2');

      return expectSaga(fetchLayoutSaga)
        .provide([
          [select(layoutSetsSelector), undefined],
          [select(instanceSelector), instance],
          [select(applicationMetadataSelector), application],
        ])
        .put(FormLayoutActions.setCurrentViewCacheKey({ key: instance.id }))
        .put(
          FormLayoutActions.fetchFulfilled({
            layouts: { page1: [], page2: [] },
            navigationConfig: { page1: undefined, page2: undefined },
          }),
        )
        .put(FormLayoutActions.updateAutoSave({ autoSave: undefined }))
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page2',
            skipPageCaching: true,
          }),
        )
        .run();
    });

    it('should set current view to first page in layout if a cached key exists but no longer exists in layout order', () => {
      jest.spyOn(networking, 'get').mockResolvedValue(mockResponseTwoLayouts);
      jest.spyOn(window.localStorage.__proto__, 'getItem');
      window.localStorage.__proto__.getItem = jest
        .fn()
        .mockReturnValue('page3');

      return expectSaga(fetchLayoutSaga)
        .provide([
          [select(layoutSetsSelector), undefined],
          [select(instanceSelector), instance],
          [select(applicationMetadataSelector), application],
        ])
        .put(FormLayoutActions.setCurrentViewCacheKey({ key: instance.id }))
        .put(
          FormLayoutActions.fetchFulfilled({
            layouts: { page1: [], page2: [] },
            navigationConfig: { page1: undefined, page2: undefined },
          }),
        )
        .put(FormLayoutActions.updateAutoSave({ autoSave: undefined }))
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page1',
            skipPageCaching: true,
          }),
        )
        .run();
    });

    it('should use instance.id as currentViewCacheKey if instance exists', () => {
      jest.spyOn(networking, 'get').mockResolvedValue(mockResponse);
      return expectSaga(fetchLayoutSaga)
        .provide([
          [select(layoutSetsSelector), undefined],
          [select(instanceSelector), instance],
          [select(applicationMetadataSelector), application],
        ])
        .put(FormLayoutActions.setCurrentViewCacheKey({ key: instance.id }))
        .put(
          FormLayoutActions.fetchFulfilled({
            layouts: { page1: [] },
            navigationConfig: { page1: undefined },
          }),
        )
        .put(FormLayoutActions.updateAutoSave({ autoSave: undefined }))
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page1',
            skipPageCaching: true,
          }),
        )
        .run();
    });

    it('should use app.id as currentViewCacheKey if no instance exists (stateless)', () => {
      jest.spyOn(networking, 'get').mockResolvedValue(mockResponse);
      return expectSaga(fetchLayoutSaga)
        .provide([
          [select(layoutSetsSelector), undefined],
          [select(instanceSelector), undefined],
          [select(applicationMetadataSelector), application],
        ])
        .put(FormLayoutActions.setCurrentViewCacheKey({ key: application.id }))
        .put(
          FormLayoutActions.fetchFulfilled({
            layouts: { page1: [] },
            navigationConfig: { page1: undefined },
          }),
        )
        .put(FormLayoutActions.updateAutoSave({ autoSave: undefined }))
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page1',
            skipPageCaching: true,
          }),
        )
        .run();
    });
  });
});
