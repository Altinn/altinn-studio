# @studio/pure-functions

Studio-Pure-Functions is a tool that has pure TypeScript functions to be used internally within Altinn-Studio. It's great for developers to have this library for functions to ensure that the pure functions used throughout Altinn Studio's applications works the same way and stay consistent.

## Contribute with new functions

All functions must start with the prefix `studio` to make it clear that it is a studio functions. We have added `eslint-rules` to check that all functions have the `studio` prefix.
All functions must be properly tested with written unit tests.
All functions must be sorted in folders where all functions belonging to the same "domain" should be put together. E.g., all string functions should be put in the `stringUtils` folder, and have one file named `stingUtils.ts` where all functions affecting strings live. It should also have one file named `stringUtils.test.ts` where all functions are properly tested.

#### Example

```ts
export const studioCombineTwoStrings = (str1: string, str2: string): string => str1 + str2;
```

## How to install Studio Pure Functions

Currently, the `@studio/pure-functions` package resides as a local package within the Altinn Studio repository. This enables all packages and apps within the Altinn Studio repository to install `@studio/pure-functions` by adding the following dependency to their package.json: `"@studio/pure-functions": "workspace:^"`, followed by running `yarn install`. The advantage of this setup is that it allows us to easily publish the package to NPM in the future.
