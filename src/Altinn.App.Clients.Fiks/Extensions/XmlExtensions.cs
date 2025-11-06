using System.Text;
using System.Xml;
using System.Xml.Serialization;

namespace Altinn.App.Clients.Fiks.Extensions;

internal static class XmlExtensions
{
    /// <summary>
    /// Serializes a data object to XML and returns a byte array.
    /// </summary>
    /// <remarks>This method was intended for "arkivmelding" and "arkivkvittering". Use for other purposes at your own risk.</remarks>
    public static ReadOnlyMemory<byte> SerializeXml<T>(this T data, bool indent = false)
    {
        var serializer = new XmlSerializer(typeof(T));

        using var memoryStream = new MemoryStream();
        var settings = new XmlWriterSettings
        {
            Encoding = new UTF8Encoding(false),
            Indent = indent,
            OmitXmlDeclaration = false,
        };

        using (var xmlWriter = XmlWriter.Create(memoryStream, settings))
        {
            serializer.Serialize(xmlWriter, data);
        }

        return memoryStream.ToArray();
    }

    /// <summary>
    /// Deserializes an XML string to an object of a given type.
    /// </summary>
    public static T? DeserializeXml<T>(this string xml)
        where T : class
    {
        if (string.IsNullOrWhiteSpace(xml))
            return null;

        var serializer = new XmlSerializer(typeof(T));
        using var stringReader = new StringReader(xml);
        using var xmlReader = XmlReader.Create(stringReader);

        return serializer.Deserialize(xmlReader) as T;
    }
}
