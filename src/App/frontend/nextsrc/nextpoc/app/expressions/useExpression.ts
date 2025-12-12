// // useExpression.ts
// // import { useStoreSubscription } from 'src/next/app/expressions/useSubscription';
// import { useStore } from 'zustand';
//
// import { useStoreSubscription } from 'src/next/app/expressions/useSubscription';
// import { layoutStore } from 'src/next/stores/layoutStore';
// import type { Expression } from 'src/features/expressions/types';
// //import type { Expression } from 'src/next/app/expressions/store';
//
// /**
//  * Evaluates an expression (if any), or returns a default.
//  * If expression is falsy, returns defaultValue immediately.
//  *
//  * For each store update, we run the selector. If the new result
//  * differs from the old one, the component re-renders.
//  */
// export function useExpression(expression: Expression | undefined, defaultValue: boolean): boolean {
//   // If no expression, just return the default
//   const evaluateExpression = useStore(layoutStore, (state) => state.evaluateExpression); //layoutStore.getState((s) => s.evaluateExpression);
//   const result = useStoreSubscription(
//     (_) => (!expression ? defaultValue : evaluateExpression(expression)),
//     defaultValue,
//   );
//
//   if (!expression) {
//     return defaultValue;
//   }
//
//   // Use our subscription to compute the expression on every state update
//
//   return result;
// }
