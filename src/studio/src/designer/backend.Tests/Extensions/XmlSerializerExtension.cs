using System;
using System.IO;
using System.Text;
using System.Xml.Serialization;

namespace Designer.Tests.Extensions
{
    public static class XmlSerializerExtension
    {
        public static object Deserialize(this XmlSerializer serializer, string xml, Type type)
        {
            byte[] byteArray = Encoding.ASCII.GetBytes(xml);
            using MemoryStream stream = new MemoryStream(byteArray);
            serializer = new XmlSerializer(type);
            var obj = serializer.Deserialize(stream);

            return obj;
        }
    }
}
