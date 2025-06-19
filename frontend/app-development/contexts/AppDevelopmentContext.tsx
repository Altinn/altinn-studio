import { PreviewContextProvider } from './PreviewContext';
import { combineComponents } from '../utils/context/combineComponents';
import { LayoutContextProvider } from './LayoutContext';

/**
 * Add all context providers for app-development to the providers-array.
 * Beware of the order of the providers, as they will be combined in the order they are added to the array.
 * The last provider in the array will be the innermost provider.
 */
const providers = [PreviewContextProvider, LayoutContextProvider];

/** Combine all context providers for app-development. */
export const AppDevelopmentContextProvider = combineComponents(...providers);
