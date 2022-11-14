import 'jest';
import '@testing-library/jest-dom/extend-expect';
import 'whatwg-fetch';
// @ts-ignore
import failOnConsole from 'jest-fail-on-console';

failOnConsole( {
    shouldFailOnWarn: true,
});