using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Json
{
    /// <summary>
    /// I simple context object for the <see cref="XmlSchemaObjectBuilder"/> actions and post process filter
    /// </summary>
    public class XmlSchemaObjectBuilderContext
    {
        /// <summary>
        /// The item being built
        /// </summary>
        public XmlSchemaObject Item { get; set; }
    }
}
