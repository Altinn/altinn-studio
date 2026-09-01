// These imports are here to make sure that the CSS of the components are rendered correctly
import '@digdir/designsystemet-css/dist/index.css';
import '@digdir/designsystemet-theme/brand/altinn/tokens.css';
import classes from './style/studioBetaTag.module.css';

export * from './components';
export * from './style/studio-variables.css';
export type { TextResource } from './types/TextResource';

/**
 * @deprecated use `studioBetaTagClasses` from `@studio/components` instead.
 */
export { classes as studioBetaTagClasses };
