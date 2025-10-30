# Studio Assistant

The Studio Assistant is a standard, shareable React package for managing AI chat in Altinn Studio.

## Interface Modes

The package contains two interface modes:

- Complete mode, with thread history, preview and a file browser
- Compact mode, a one-column version which only contains a single chat thread. Typical usage is as a pop-up assistant in the lower right corner of the browser window.

## Installation

Since this package is part of a monorepo, you can include it in your project using Yarn:
`yarn add "@studio/assistant@workspace:^"`

## Dependencies

This package aims to keep the number of dependencies to a minimum, mainly to prevent circular dependencies in Studio, but also to make the package easier to port to other uses.

When making changes to this package, do not include other dependencies than:

- React
- studio-components
- studio-hooks
- studio-icons
- studio-pure-functions

Note that there is no translation capability set up for this module, so all texts must be passed through the `texts` prop.
