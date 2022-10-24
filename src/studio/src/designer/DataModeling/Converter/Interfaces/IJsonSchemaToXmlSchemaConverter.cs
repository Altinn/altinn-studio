using System;
using System.Xml.Schema;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Interfaces
{
    /// <summary>
    /// Interface for converting Json schema to Xml schema
    /// </summary>
    public interface IJsonSchemaToXmlSchemaConverter
    {
        /// <summary>
        /// Converts a <see cref="JsonSchema"/> to a matching <see cref="XmlSchema"/>
        /// </summary>
        /// <param name="schema">The schema to convert</param>
        XmlSchema Convert(JsonSchema schema);

        /// <summary>
        /// Converts a <see cref="JsonSchema"/> to a matching <see cref="XmlSchema"/>
        /// </summary>
        /// <param name="schema">The schema to convert</param>
        /// <param name = "schemaUri" > Uri that represents the unique id of the Json Schema.</param>
        /// <returns>XmlSchema genrated based on the Json Schema.</returns>
        XmlSchema Convert(JsonSchema schema, Uri schemaUri);
    }
}
