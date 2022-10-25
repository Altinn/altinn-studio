#nullable enable
using System.Linq;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Utils
{
    /// <summary>
    /// Extension methods for navigating a JsonSchema
    /// </summary>
    public static class JsonSchemaNavigationExtensions
    {
        /// <summary>
        /// Follows a JsonPointer and returns the target schema.
        /// </summary>
        /// <remarks>Does not support relative JSON Pointers</remarks>
        /// <param name="schema">The root JSON Schema</param>
        /// <param name="path">The path to follow</param>
        /// <returns>The JSON Schema found by following the pointer</returns>
        public static JsonSchema FollowReference(this JsonSchema schema, JsonPointer path)
        {
            return schema.FindSubschema(path);
        }

        /// <summary>
        /// JsonSchema.Net library currently does not support finding subschema by default.
        /// Concept for finding schema is ported from internal method that library is using for finding subschemas.
        /// https://github.com/gregsdennis/json-everything/blob/master/JsonSchema/JsonSchema.cs
        /// </summary>
        private static JsonSchema FindSubschema(this JsonSchema jsonSchema, JsonPointer pointer)
        {
            object resolvable = jsonSchema;
            for (var i = 0; i < pointer.Segments.Length; i++)
            {
                var segment = pointer.Segments[i];
                object? newResolvable = null;

                int index;
                switch (resolvable)
                {
                    case ISchemaContainer container:
                        newResolvable = container.Schema;

                        // need to reprocess the segment
                        i--;
                        break;
                    case ISchemaCollector collector:
                        if (int.TryParse(segment.Value, out index) &&
                            index >= 0 && index < collector.Schemas.Count)
                        {
                            newResolvable = collector.Schemas[index];
                        }

                        break;
                    case IKeyedSchemaCollector keyedCollector:
                        if (keyedCollector.Schemas.TryGetValue(segment.Value, out var subschema))
                        {
                            newResolvable = subschema;
                        }

                        break;
                    case JsonSchema schema:

                        newResolvable = schema.Keywords?.FirstOrDefault(k => k.Keyword() == segment.Value);
                        break;
                }

                if (newResolvable is UnrecognizedKeyword unrecognized)
                {
                    var newPointer = JsonPointer.Create(pointer.Segments.Skip(i + 1), true);
                    newPointer.TryEvaluate(unrecognized.Value, out var value);
                    return JsonSchema.FromText(value?.ToString() ?? "null");
                }

                resolvable = newResolvable!;
            }

            return resolvable as JsonSchema;
        }
    }
}
