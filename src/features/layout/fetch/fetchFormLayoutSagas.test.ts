import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import {
  applicationMetadataSelector,
  cleanLayout,
  fetchLayoutSaga,
  instanceSelector,
  layoutSetsSelector,
} from 'src/features/layout/fetch/fetchFormLayoutSagas';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import * as networking from 'src/utils/network/networking';
import type { CompFileUploadWithTagExternal } from 'src/layout/FileUploadWithTag/config.generated';
import type { CompGroupExternal } from 'src/layout/Group/config.generated';
import type { CompSummaryExternal } from 'src/layout/Summary/config.generated';
import type { IHiddenLayoutsExternal } from 'src/types';
import type { IApplication, IInstance } from 'src/types/shared';

describe('fetchFormLayoutSagas', () => {
  describe('cleanLayout', () => {
    it('should convert incorrectly cased types to the correct case', () => {
      expect(
        cleanLayout([
          { type: 'group' } as any as CompGroupExternal,
          { type: 'sUMMARY' } as any as CompSummaryExternal,
          { type: 'FileuploadwithTAG' } as any as CompFileUploadWithTagExternal,
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
          hidden: ['equals', true, false],
          layout: [],
        },
      },
    };
    const mockResponseTwoLayouts = {
      ...mockResponse,
      page2: {
        data: {
          hidden: ['equals', 1, 2],
          layout: [],
        },
      },
    };
    const mockResponseTwoLayoutsNoHidden = {
      ...mockResponse,
      page2: {
        data: {
          layout: [],
        },
      },
    };

    const hiddenExprPage1: IHiddenLayoutsExternal = {
      page1: ['equals', true, false],
    };

    const hiddenExprPage2: IHiddenLayoutsExternal = {
      page2: ['equals', 1, 2],
    };

    it('should call relevant actions when layout is fetched successfully', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue(mockResponse);

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
            hiddenLayoutsExpressions: { ...hiddenExprPage1 },
            layoutSetId: null,
          }),
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page1',
            skipPageCaching: true,
          }),
        )
        .run();
    });

    it('should work when a single layout is returned', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue(mockResponse.page1);

      return expectSaga(fetchLayoutSaga)
        .provide([
          [select(layoutSetsSelector), undefined],
          [select(instanceSelector), instance],
          [select(applicationMetadataSelector), application],
        ])
        .put(
          FormLayoutActions.fetchFulfilled({
            layouts: { FormLayout: [] },
            navigationConfig: {},
            hiddenLayoutsExpressions: { FormLayout: hiddenExprPage1['page1'] },
            layoutSetId: null,
          }),
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'FormLayout',
            skipPageCaching: true,
          }),
        )
        .run();
    });

    it('should call fetchRejected when fetching layout fails', () => {
      jest.spyOn(networking, 'httpGet').mockRejectedValue(new Error('some error'));

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
      jest.spyOn(networking, 'httpGet').mockResolvedValue(mockResponseTwoLayoutsNoHidden);
      jest.spyOn(window.localStorage.__proto__, 'getItem');
      window.localStorage.__proto__.getItem = jest.fn().mockReturnValue('page2');

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
            hiddenLayoutsExpressions: {
              ...hiddenExprPage1,
              page2: undefined,
            },
            layoutSetId: null,
          }),
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page2',
            skipPageCaching: true,
          }),
        )
        .run();
    });

    it('should set current view to first page in layout if a cached key exists but no longer exists in layout order', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue(mockResponseTwoLayouts);
      jest.spyOn(window.localStorage.__proto__, 'getItem');
      window.localStorage.__proto__.getItem = jest.fn().mockReturnValue('page3');

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
            hiddenLayoutsExpressions: {
              ...hiddenExprPage1,
              ...hiddenExprPage2,
            },
            layoutSetId: null,
          }),
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page1',
            skipPageCaching: true,
          }),
        )
        .run();
    });

    it('should use instance.id as currentViewCacheKey if instance exists', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue(mockResponse);
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
            hiddenLayoutsExpressions: { ...hiddenExprPage1 },
            layoutSetId: null,
          }),
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page1',
            skipPageCaching: true,
          }),
        )
        .run();
    });

    it('should use app.id as currentViewCacheKey if no instance exists (stateless)', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue(mockResponse);
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
            hiddenLayoutsExpressions: { ...hiddenExprPage1 },
            layoutSetId: null,
          }),
        )
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
