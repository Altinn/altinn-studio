# Schema Model

This is the `schema-model`-package. It's separated from the implementation in `schema-editor` to be able to easier
test and develop both packages. This package handles reading the json schema and flattening it to an array which
is easier to work with.

Some field is passed more or less directly to the model, which others are dealt with in more structured ways to for
instance cast the correct types of fields and so on.

### Mutations

All mutations of the model should be immutable. So every mutation function will return a new copy of the array. Atm
this package can:

- Convert nodes between a normal field and a reference and back again.
- Copy a node
- Add new nodes to the tree
- Remove nodes from the tree
- Rename nodes
- And sort nodes

Mutations is kept in the [/mutations](src/lib/mutations)-folder and should be fairly well tested.

### Node caching

An array in javascript have limited performance on large datasets. This package offloads some of the searching to dedicated
indexes that is used to solve those performance issues. It's mainly references that is solved this way, both references
to types and parent-child relations. Se more in [selectors.ts](src/lib/selectors.ts).

### Exceptions and Errors

The solution will throw errors when encountering situations that should not occur. This is a design choice. The application
need to handle these exceptions. At the current iteration of this package errors are not translatable.

### Known problems

#### Custom fields on arrays

This model merges the levels of a json-schema array. This makes it easier to toggle this with a simple boolean value.

So the internal model will make it super easy to toggle a field like this:

```json
{
  "type": "array",
  "items": {
    "type": "number"
  }
}
```

to become:

```json
{
  "type": "number"
}
```

and back again. The problem this introduces is very limited. But this model will not take in account that custom fields
might be on both levels. So for instance if you pass inn the following json schema:

```json
{
  "type": "array",
  "items": {
    "type": "number",
    "my-custom-field": "custom-value"
  }
}
```

The model will not be able to put it back on the right place.

#### Nullable Nodes

Should add support for nullable items. This should be handled inside this component and
nodes should just expose an `isNullable`-property.

Problem is that there are at least two ways of creating nullables in JSON-schemas. You could
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

This is a problem that is not really solved.

### Final considerations

JSON-schemas can be endlessly complex. Try to limit which features that you want to support. Less is more. Happy validating!
