import { call, select, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import type { IRuntimeState } from 'src/types';

export function* waitForFunc(
  selector: (state: IRuntimeState) => boolean,
): SagaIterator {
  if (yield select(selector)) {
    return;
  }
  while (true) {
    yield take('*');
    if (yield select(selector)) {
      return;
    }
  }
}

/**
 * This saga effect allows you to wait for a specific state to change. It will wait for new actions to be dispatched
 * until your selector returns true, and it might be a safer way to wait than running yield take(...) on the action
 * you wanted to wait for (as this will return immediately if the state already is as expected, instead of waiting
 * for the event in question).
 */
export const waitFor = (selector: (state: IRuntimeState) => boolean) =>
  call(waitForFunc, selector);
