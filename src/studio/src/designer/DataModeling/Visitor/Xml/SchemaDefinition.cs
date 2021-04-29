using Json.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Xml
{
    /// <summary>
    /// Helper class for build Json Schema hierarchy from xml schema
    /// </summary>
    internal class SchemaDefinition
    {
        /// <summary>
        /// The name of the property if any
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Json Schema definition for the node
        /// </summary>
        public JsonSchema Schema { get; set; }

        /// <summary>
        /// True if this is a property and it is required
        /// </summary>
        public bool IsRequired { get; set; }
    }
}
