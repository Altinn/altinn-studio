# Full components in children replaces IDs

- Status: proposed
- Deciders: Team | Product Owners
- Date: 14.4.2026

## Problem context

Currently, layouts for rows of data in list structures are defined like this:

```
[
	{
		"type": "RepeatingGroup",
		"children": [ "childOne" ],
		"datamodelBinding": "people"
	},
	{
		"id": "childOne",
		"type": "input",
		"datamodelBinding": "people.name"
	}
]
```

This has several disadvantages:

- When creating layouts you you must define a component somewhere on the page, copy the ID and put it into the children array. This forces you to scroll up and down to see what components are rendered where.
- You will have components in your layout that is not actually rendered where the appear in the layout file. This is confusing.
- It also complicates layout rendering in the application code:
  - When rendering we must iterate through the layout and replace IDs with actual components
  - We must somehow indicate that the component has been moved and then prevent rendering that component.

## Decision drivers

- B1: Make it easier to work with layout files
- B2: Makes layout rendering more intuitive in the source code
- B3: Aligns with future implementation of reusable components/custom component libraries

## Alternatives considered

A1: Define full components as children instead of IDs

We define the full components as children:

```
[
	{
		"type": "VehicleRepeatingGroup",
		"extends": "RepeatingGroup",
		"children": [
			{
				"id": "childOne",
				"type": "input",
			}
		 ]
	}
]
```

A2: Wrap the child components in an object to indicate that they are not part of the normal layout flow:

```
{
  "layout":
    [
    {
      "id":"A",
       "children":
        ["B"]
       }
     ],
     "components":[
     {
     "id":"B"
     }
   ]
 }
```

## Pros and cons

### A1

#### Pros

- Supports B1 because children components are defined directly in the children array so you dont have to scroll down to see what component will be rendered where.
- Supports B1 because you will no longer have components defined on the page that will not be rendered where they are defined.
- Supports B2 because we do not have to replace IDs with the actual component
- Supports B2 because we do not have to block rendering of components that is used in a children array
- Aligns well with reusable components if we go for custom components pattern (described in ADR: [2026-04-14-reusable-components.md](2026-04-14-reusable-components.md), option A1)

#### Cons

- Breaking change: will require migration script
- Breaking change: will require support in Altinn Studio
- Blocks [2026-04-14-reusable-components.md](2026-04-14-reusable-components.md) solution A2

#### A2

#### Pros

- Supports B1 because it will be clear that certain components are not part of the normal layout
- Supports B2 because it will be clear that components inside the components object are not part of the normal layout flow, and does not need to be marked as 'claimed'
- Aligns well with both Reusable Components options A1 and A2

#### Cons

- Users will still have to scroll up and down to see what components are rendered where
- Code will still have to replace IDs with components
