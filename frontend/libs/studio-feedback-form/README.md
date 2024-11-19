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

The central class in this package is FeedbackFormImpl, which provides access to a type-safe feedback form with pre-defined question types.
Consumers supply a configuration object, allowing for customization of the questions displayed in the form.

```tsx
const MyFeedbackForm = (): React.ReactElement => {
  const { getFeedbackForm } = new FeedbackFormImpl({
    buttonText: {
      close: 'Close',
      trigger: 'Give feedback',
      submit: 'Submit',
    },
    heading: 'Feedback',
    questions: [
      {
        id: '1',
        type: 'yesNo',
        questionText: 'Is this better than before?',
        buttonLabels: {
          yes: 'Yes',
          no: 'No',
        },
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

Note that there is no translation capability set up for this module, so all texts must be passed explicitly (i.e. do the translation where you implement this module).

### Questions

There are currently 2 types of questions available:

- `yesNo`: Yes/No, displayed as buttons with thumbs up/down icon.
- `text`: Basic text field for input

The plan is to also include:

- `checkbox`: Group of checkboxes that display the provided options

More question types could be added as needed, but we should strive to keep this module as simple as possible.
