import * as redux from 'redux';

// A little hack while we wait for this PR to be merged: https://github.com/zalmoxisus/redux-devtools-extension/issues/492

declare module 'redux' {
  export type GenericStoreEnhancer = any;
}