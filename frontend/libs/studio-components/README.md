# @altinn/studio-components

Studio-Components is a tool that wraps around `@digdir/design-system-react` and `@digdir/design-system-tokens`, giving you access to the Designsystem's componetns and tokens adding Altinn customisation to them. It is also a place where internal components for altinn-studio lives, where they follow a "dummy-components" pattern. It's great for delvelopers and designers to have this library for components to ensure that the components used throughout altinn studio's applications looks great and stay consistent.

## Contribute with new components

All components must start with the prefix `Studio` to make it clear that it is a studio component.
All components must be properly tested with written unit tests.
All components must be inside their own folder, together with their CSS and unit test.

## How to install Studio Components

Currently, the `@altinn/studio-components` package resides as a local package within the Altinn Studio repository. This enables all packages and apps within the Altinn Studio repository to install `@altinn/studio-components` by adding the following dependency to their package.json: `"@altinn/studio-components": "workspace:^"`, followed by running `yarn install`. The advantage of this setup is that it allows us to easily publish the package to NPM in the future.
