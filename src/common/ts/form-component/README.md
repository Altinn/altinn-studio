# form-component

The React components that render the forms of Altinn apps. They are moving here from the
[App frontend](../../../App/frontend/README.md) to keep the UI apart from the app's logic, and so that Storybook can
show each component on its own. Later, this may also let Designer render its preview with them.

- [app-components](src/app-components/README.md) know nothing about the app that contains them.
- [layout-components](src/layout-components/README.md) are the components that an app developer configures in
  Designer.

Keep business logic out of this package. Code that does not depend on React stays in the App frontend or moves to
`form-engine`, so that leaving React would mean rewriting only this package.
