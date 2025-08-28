# @studio/pure-functions

Studio-Pure-Functions is a tool that has pure TypeScript functions to be used internally within Altinn Studio. It's great for developers to have this library for functions to ensure that the pure functions used throughout Altinn Studio's applications work the same way and stay consistent.

## Contribute with new functions

All functions must be properly tested with written unit tests.
They should be placed in static classes based on the kind of parameters they are acting upon. E.g., all string functions should be put in the `StringUtils` class, which should have a corresponding `StringUtils.test.ts` file.
The functions should be pure, which means that they return the same value each time they are called, and that they do not have any side effects or modify existing data.

#### Example

````ts
export class StringUtils {
  public static combineTwoStrings = (str1: string, str2: string): string => str1 + str2;
}
```

## How to install Studio Pure Functions

Currently, the `@studio/pure-functions` package resides as a local package within the Altinn Studio repository. This enables all packages and apps within the Altinn Studio repository to install `@studio/pure-functions` by adding the following dependency to their package.json: `"@studio/pure-functions": "workspace:^"`, followed by running `yarn install`. The advantage of this setup is that it allows us to easily publish the package to NPM in the future.
````
