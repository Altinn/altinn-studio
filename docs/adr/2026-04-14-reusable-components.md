# Reusable components

- Status: proposed
- Deciders: Team | Product Owners
- Date: 14.4.2026

Result

## Problem context

As an app developer I want to be able to create custom components that can be easily reused.

## Decision drivers

- B1: Makes it intuitive to create and use reusable components when working with layouts in source code
- B2: Facilitates making a good UI for reusable components in Altinn Studio

## Alternatives considered

A1: custom components folder in your ui folder

- We support a new folder called `App/ui/custom-components`
- In this folder you can create your own components like this:

`Vehicles.json`:

```
{
  "type": "RepeatingGroup",
  "dataModelBinding": "vehicles",
  "children" : [
    {
      "type": "Input",
      "dataModelBinding": ".regNo"
    },
  {
    "type": "Input",
    "dataModelBinding": ".manufacturer"
    }
  ]
}
```

This can then be used in your layout like this:

```
{
	"layout" : [
		{
			"type": "Vehicles",
			"dataModelBinding": "MyDataModel.Cars"
		},
		{
			"type": "Vehicles",
			"dataModelBinding": "MyDataModel.Mopeds"
		}
		]
}
```

A2: Reuse of components defined in the same layout file

```
{
"layout": [
	{
		"type": "RepeatingGroup",
		"children": [ "childOne" ],
		"datamodelBinding": "mopeds"
	},
	{
		"type": "RepeatingGroup",
		"children": [ "childOne" ],
		"datamodelBinding": "cars"
	},
	{
		"id": "childOne",
		"type": "input",
		"datamodelBinding": ".name"
	},
]
}
```

In this solution, the same component can be used inside multiple repeating groups in the same layout file.

## Pros and cons

### A1

#### Pros

- Supports B1 because you can neatly keep your custom components in a separate folder
- Supports B1 because you can reuse your custom components across several layout files
- Supports B2 because this structure aligns well with creating an intuitive UI for a component library in Altinn Studio

#### Cons

- More complex to implement than A2

### A2

#### Pros

- Easy to implement with the current system where you specify component IDs in children

#### Cons:

- Not particularly intuitive to understand the connection between child and parent components
- Possibly harder to make an intuitive UI in studio
- Does not align with component library
