# Schema Model

### Known problems

Just a little list of what we need to add.

#### Nullable Nodes

Should add support for nullable items. This should be handeled inside this component and
nodes should just expose an `isNullable`-property.

Problem is that there are atleast two ways of creating nullables in JSON-schemas. You could
use the `type`-property and just set this to `type: ["string","null"]` this is a very easy
inspection. Alternatively you could use `anyOf` or `oneOf` to create structures like this:

```json
{
  "anyOf": [{ "ref": "#/$defs/some-type" }, { "type": "null" }]
}
```

...or:

```json
{
  "oneOf": [{ "ref": "#/$defs/some-type" }, { "type": "null" }]
}
```

I think this is the only way to make a reference nullable.

#### Toggling between field and array

In the current version we doesn't support toggling between a field and an array. This is creating
some problems as it might delete custom attributes connected to either items. We also need to
take a choice about how we work with these kind of problems. Do we accept swapping between types
when restrictions are added or not?

#### Performance issues on large models

Since we changed from a map to an array to hold the internal model performance is actually an issue.
We need to create some sort of index to improve this. This problem will however just hit VERY large models
with thousands of nodes. Mainly created by converting old SERES models to JSON-schemas without any form for
simplification.

#### Limit exposed exports from this package

Not a big issue, but at some point we should just expose what is actually used and try to limit this for a cleaner
surface between these very interconnected models.


