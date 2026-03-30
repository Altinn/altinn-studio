using Altinn.Studio.DataModeling.Json.Keywords;
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
            var buildOptions = JsonSchemaKeywords.GetBuildOptions();
            var buildContext = new BuildContext
            {
                Dialect = buildOptions.Dialect ?? Dialect.Default,
                LocalSchema = schema.Root.Source,
            };
            var node = (schema as IBaseDocument).FindSubschema(path, buildContext);
            if (node == null)
            {
                return null;
            }

            return JsonSchema.Build(node.Source, buildOptions);
        }
    }
}
