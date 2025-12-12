// // useSubscription.ts
// import { useEffect, useRef, useState } from 'react';
//
// import { layoutStore } from 'src/next/stores/layoutStore';
//
// // import { useLayoutStore } from 'src/next/app/expressions/store';
//
// // A small hook that subscribes to the store, runs a selector, and triggers
// // a state update only if the selected value changes.
// export function useStoreSubscription<T>(
//   selector: (state: ReturnType<typeof layoutStore.getState>) => T,
//   defaultValue: T,
// ): T {
//   const [localValue, setLocalValue] = useState<T>(() => {
//     // Initial compute
//     const currentState = layoutStore.getState();
//     return selector(currentState);
//   });
//
//   // Keep a mutable reference to track the last computed value
//   const lastVal = useRef<T>(localValue);
//
//   useEffect(() => {
//     // Subscribe to store changes
//     const unsub = layoutStore.subscribe((state) => {
//       const nextVal = selector(state);
//       // Only update if the new value is different
//       if (nextVal !== lastVal.current) {
//         lastVal.current = nextVal;
//         setLocalValue(nextVal);
//       }
//     });
//
//     return () => {
//       unsub();
//     };
//   }, [selector]);
//
//   return localValue;
// }
