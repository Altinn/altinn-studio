# App frontend template - React

## Prerequisites
1. An app built in Altinn Studio.
2. The altinn-studio repo cloned to your local machine.
2. Follow instructions for setting up apps to run locally [here](https://docs.altinn.studio/teknologi/altinnstudio/development/handbook/front-end/developing/#app-frontend).

## Getting started

### Setting up the frontend to run
1. Navigate to the template folder.

```cmd
cd altinn-studio/src/Altinn.Apps/AppTemplates/react
```
2. Install dependencies

```cmd
npm ci
npm run install-deps
```

3. Run application

```cmd
cd altinn-app-frontend
npm start
``` 

  This will run the application on localhost:8080. Make sure to point to localhost in the `Index.cshtml` file, as described in instructions for setting up app to run locally (link above). Any changes made in the app frontend will automatically trigger a new build/reload.

4. Build application
To build the application (f.ex to host the .js-file somewhere and reference it from the `Index.cshtml` file), run 

```cmd
cd altinn-app-frontend // If not already in this folder
npm run build
``` 

### Modifying the frontend
The template is set up with some standard functionality, that is also included in the standard app frontend. F.ex. instantiation, party selection, and routing between these and the process step views. Calls to get data like party information, user profile, language/texts etc. are also set up, and the standard AltinnAppHeader component is shown at the top of the page. 

In the template, all standard process step views have been removed, and replaced with a CustomView component, that you can use to customize your views. It is located in `src/features/custom`. 

With the current setup, this view is the default for all process steps. If the instance is archived, the standard receipt view is shown. Use the CustomView as a starting point for building your own frontend.

