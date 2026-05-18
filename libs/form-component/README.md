# Form-component library for Altinn Studio Apps

This package contain code related to the user interface in forms for Apps made with Altinn Studio.

It was created to isolate the form rendering code of /src/App/frontend. As of May 2026, it is still in early development and we will continue to move more code from /src/App/frontend into this library in the future.

## Architectural guideline and visions

### Content

The library will contain to main folder :

- app-components : Simple React component based on Designsystemet. They receive and display data in the form of props and report data changes in a callback.
- layout-components : The components that a user can select in Designer to build the user interface of their app.

### Altinn Studio Preview

Today, preview in Altinn Studio is done by using a prebuilt version of the App-frontend.
It would be nice if preview in Altinn Studio could be done by just rendering the preview as a React-component in the Studio-appliction. One benefit of this is that it would give a better user experience when updating the preview after the user has made changes to the application, as we can just use standard rerendering in React to achieve this instead of rerendering the entire application.

In the future it should be possible to use this library from Studio Designer to show a preview of the Application. We could export a React component, FromComponent, that would render a given form, and Alltin Studio can just pass props with the data about the form to this component.

### Rendering and React focused

This library should contain as little business logic as possible and mainly focus on rendering based on given props and data. Logic can either live in src/App/frontend, or be moved to the new library libs/form-engine.
A good rule of thumb is that if a piece of code does not rely on React, see if it can live in app/Frontend or libs/form-engine instead of in this library. In other words, if we for some reason were to use another library than React, it is beneficial if this library only contains code that actually needs to be rewritten because of that change.
