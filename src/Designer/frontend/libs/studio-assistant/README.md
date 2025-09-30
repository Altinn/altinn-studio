# Studio Assistant

The Assistant is a standard, shareable package for managing AI chat in Studio.
The library provides a consistent interface, and allows for easy reuse across different projects.

This package takes a configuration object from you as consumer, making it flexible for various needs.

## Installation

Since this package is part of a monorepo, you can include it in your project using Yarn:
`yarn add "@studio/assistant@workspace:^"`

## Usage

The central class in this package is AssistantImpl. Consumers supply a configuration object, allowing for customization.

```tsx
const MyAssistant = (): React.ReactElement => {
  const { getAssistant } = new AssistantImpl({
    heading: 'AI Assistant',
    buttonTexts: {
      send: 'Send',
    },
    onSubmitMessage: handleSubmitMessage,
  });

  return <div>{getAssistant()}</div>;
};
```

Note that there is no translation capability set up for this module, so all texts must be passed explicitly (i.e. do the translation where you implement this module).
