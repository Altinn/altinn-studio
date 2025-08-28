# Studio Content Library

The Content Library is a standard, shareable package for managing resources like code lists, images, and other
content assets within Studio. The library provides a consistent interface for handling these resources and
allows for easy reuse across different projects.

This package defines a set of predefined pages, and it takes a configuration object from you as consumer, making it
flexible for various needs. You as consumer of this library supply data from your own APIs, ensuring that resource
management is both standardized and adaptable.

## Installation

Since this package is part of a monorepo, you can include it in your project using Yarn:
`yarn add "@studio/content-resource-library@workspace:^"`

## Usage

The central class in this package is ResourceContentLibraryImpl, which provides access to predefined, type-safe pages
designed to manage various resources. Consumers supply a configuration object, allowing for resource customization while
ensuring consistency across different applications. For example, the same library can be used for both an Organization
Library and an App Library by providing different implementations, offering flexibility without sacrificing uniformity.

```tsx
const MyInternalContentLibrary = (): React.ReactElement => {
  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      root: {
        props: {
          title: 'Welcome to App Library for resources',
          children: <div>My custom component</div>,
        },
      },
      codeList: {
        props: {
          title: 'Codelists for apps',
        },
      },
    },
  });

  return <div>{getContentResourceLibrary()}</div>;
};
```
