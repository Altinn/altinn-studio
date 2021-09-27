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
            IRefResolvable schemaSegment = schema;
            foreach (var segment in path.Segments)
            {
                schemaSegment = schemaSegment.ResolvePointerSegment(segment.Value);
                if (schemaSegment == null)
                {
                    return null;
                }
            }

            return schemaSegment as JsonSchema;
        }
    }
}
