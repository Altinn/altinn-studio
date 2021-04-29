using System.Collections.Generic;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Xml
{
    /// <summary>
    /// Extension methods for working with a <see cref="List{T}"/> with generic type <see cref="SchemaDefinition"/>
    /// </summary>
    internal static class SchemaDefinitionListExtensions
    {
        /// <summary>
        /// Add a schema definition to the list of definitions.
        /// </summary>
        /// <param name="list">The list to add the definition to</param>
        /// <param name="name">The name of the property if any</param>
        /// <param name="schema">The schema for the definition</param>
        /// <param name="isRequired"><code>true</code> if the definition is a property and is required</param>
        /// <param name="optionalScope"><code>true</code> if the definition is a part of an optional object</param>
        /// <param name="arrayScope"><code>true</code> if the definition is a part of an array object</param>
        public static void Add(this List<SchemaDefinition> list, string name, JsonSchema schema, bool isRequired, bool optionalScope, bool arrayScope)
        {
            if (arrayScope || optionalScope)
            {
                isRequired = false;
            }

            list.Add(new SchemaDefinition
            {
                Name = name,
                Schema = schema,
                IsRequired = isRequired
            });
        }
    }
}
