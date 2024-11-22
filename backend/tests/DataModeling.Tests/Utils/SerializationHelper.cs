using System;
using System.IO;
using System.Text;
using System.Xml.Serialization;
using SharedResources.Tests;

namespace DataModeling.Tests.Utils
{
    public static class SerializationHelper
    {
        public static object Deserialize(string xml, Type type)
        {
            byte[] byteArray = Encoding.ASCII.GetBytes(xml);
            using MemoryStream stream = new MemoryStream(byteArray);
            var serializer = new XmlSerializer(type);
            var obj = serializer.Deserialize(stream);

            return obj;
        }

        public static string SerializeXml(object o)
        {
            var xmlSerializer = new XmlSerializer(o.GetType());
            using var textWriter = new Utf8StringWriter();
            xmlSerializer.Serialize(textWriter, o);
            return textWriter.ToString();
        }
    }
}
