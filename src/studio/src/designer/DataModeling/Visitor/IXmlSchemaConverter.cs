using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Visitor
{
    /// <summary>
    /// Converter interface for an XmlSchema
    /// </summary>
    /// <typeparam name="T">The type to convert into</typeparam>
    public interface IXmlSchemaConverter<out T>
    {
        /// <summary>
        /// Convert a schema into the give type
        /// </summary>
        /// <param name="schema">The object to visit</param>
        T Convert(XmlSchema schema);
    }
}
