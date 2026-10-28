# Shared layout component code

Components and helpers that several layout components share. Like the layout components, they may use the app's
context.

## Storybook docs page

Each layout component's Storybook page shows the props that an app developer configures in Designer, grouped into
Text, Data and Innhold as Designer groups them. The props that the runtime injects follow, collapsed.
[DemoLayoutComponent](../DemoLayoutComponent) shows the setup:

1. In the stories file, export a `*_PROP_CATEGORIES` map that gives each prop the category `text`, `data`, `content`
   or `runtime`. List the map in `excludeStories`, since Storybook treats every named export as a story.
2. Add a `.mdx` file beside the stories that renders `LayoutComponentDocs` with the map.
