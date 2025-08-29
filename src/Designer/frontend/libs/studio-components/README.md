# @studio/components

Studio Components is an internal library developed for Team Altinn Studio to facilitate the construction of the UI for
our no-code tool.
These components are built on top of `@digir/designsystemet` to implement to our specific needs. We leverage the
components provided by the designsystemet and compose them together to
create more complex components to be more useful to our use cases.

## Contribute with new components

All components should follow the "dummy-pattern", meaning all components is only getting data through props and does not
using API calls or any other side-effects to get data. This is to make sure that the components are reusable and can be
used in different contexts.

All components must start with the prefix `Studio` to make it clear that it is a studio component. We have
added `eslint-rules` to check that all components have the `Studio` prefix.
All components must be properly tested with written unit tests.
All components must be inside their own folder, together with their CSS and unit test. It is important that all exported
components has the same name as the folder they are in.
All components must follow the structure where its props are extending the `HTMLAttributes` and the type of the element
used at the top-level. By doing this, we ensure that we can automatically send all props that belongs to the native
element.
The components must also use `forwardRef` to make sure it supports React Top Level API.

#### Example

```tsx
type StudioButtonProps = {
  size?: 'small' | 'medium' | 'large';
} & HTMLAttributes<HTMLButtonElement>;

export const StudioButton = forwardRef<HTMLButtonElement, StudioButtonProps>(
  ({ size = 'medium', children, ...rest }: ButtonProps, ref): ReactNode => {
    return (
      <button {...rest} ref={ref}>
        <Paragraph size={size} asChild>
          <span>{children}</span>
        </Paragraph>
      </button>
    );
  },
);
```

## How to install Studio Components

Currently, the `@studio/components` package resides as a local package within the Altinn Studio repository. This enables
all packages and apps within the Altinn Studio repository to install `@studio/components` by adding the following
dependency to their package.json: `"@studio/components": "workspace:^"`, followed by running `yarn install`. The
advantage of this setup is that it allows us to easily publish the package to NPM in the future.
