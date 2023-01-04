using System;
using System.IO;
using System.Text;
using System.Xml.Serialization;

namespace Designer.Tests.Utils
{
    public class SerializationHelper
    {
        public static object Deserialize(string xml, Type type)
        {
            byte[] byteArray = Encoding.ASCII.GetBytes(xml);
            using MemoryStream stream = new MemoryStream(byteArray);
            var serializer = new XmlSerializer(type);
            var obj = serializer.Deserialize(stream);

            return obj;
        }
    }
}
