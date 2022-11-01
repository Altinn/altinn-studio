using System;
using System.Xml.Schema;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Interfaces
{
    /// <summary>
    /// Interface for converting Xml schema to Json schema
    /// </summary>
    public interface IXmlSchemaToJsonSchemaConverter
    {
        /// <summary>
        /// Convert a schema into the give type
        /// </summary>
        /// <param name="schema">The object to visit</param>
        JsonSchema Convert(XmlSchema schema);

        /// <summary>
        /// Convert a schema into the give type
        /// </summary>
        /// <param name="schema">The object to visit</param>
        /// <param name="schemaUri">Uri that represents the unique id of the Json Schema.</param>
        JsonSchema Convert(XmlSchema schema, Uri schemaUri);
    }
}
