# @studio/icons

Studio-Icons is a tool that wraps around `@navikt/aksel-icons`, giving you access to Aksel's icons and adding Altinn's custom icons. It's great for developers and designers because they can use `@navikt/aksel-icons` for common tasks and seamlessly switch to Altinn's unique icons when required. This blend of resources ensures your user interfaces look great, stay consistent, and remain flexible in terms of icon choices.

## Contribute with new Icons

All icons must stick to the same rules for their colors and sizes. We've set up tests that go through each icon to make sure they're the right width, height, color, and view. If a new icon doesn't follow these rules, the tests will catch it and let you know. Here are the rules:

- Icons should be 24 pixels wide and 24 pixels tall, `width="24" height="24"`.
- The viewbox should be `viewbox="0 0 24 24"`.
- All colors should always be currentColor.
- All icons should use the shared `IconProps`, to ensure consistency in the icon API.

## How to install Altinn Icons

Currently, the `@studio/icons` package resides as a local package within the Altinn Studio repository. This enables all packages and apps within the Altinn Studio repository to install `@studio/icons` by adding the following dependency to their package.json: `"@studio/icons": "workspace:^"`, followed by running `yarn install`. The advantage of this setup is that it allows us to easily publish the package to NPM in the future.
