# Studio Feedback Form

The Feedback Form is a standard, shareable package for managing user feedback in Studio.
The library provides a consistent interface for handling these forms, and allows for easy reuse across different projects.

This package defines a set of predefined pages, and it takes a configuration object from you as consumer, making it
flexible for various needs. You as consumer of the feedback form supply your own questions,
and the method for handling submitted data.

## Installation

Since this package is part of a monorepo, you can include it in your project using Yarn:
`yarn add "@studio/feedback-form@workspace:^"`

## Usage

The central class in this package is FeedbackFormImpl, which provides access to predefined, type-safe pages
designed to manage various resources. Consumers supply a configuration object, allowing for customization of the questions displayed in the form.

```tsx
const MyFeedbackForm = (): React.ReactElement => {
  const { getFeedbackForm } = new FeedbackFormImpl({
    triggerButtonText: 'Give feedback',
    closeButtonText: 'Close',
    heading: 'Feedback',
    questions: [
      {
        id: '1',
        type: 'yesNo',
        questionText: 'Is this better than before?',
      },
      {
        id: '2',
        type: 'text',
        questionText: 'What can we improve?',
      },
    ],
  });

  return <div>{getFeedbackForm()}</div>;
};
```
