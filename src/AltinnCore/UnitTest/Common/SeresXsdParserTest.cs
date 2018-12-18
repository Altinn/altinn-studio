using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Moq;
using Xunit;

namespace AltinnCore.UnitTest.Common
{
    /// <summary>
    /// Tests converting Json Schema to XSD
    /// </summary>
    public class SeresXsdParserTest
    {
        /// <summary>
        /// Converting edag Json Schema to XSD
        /// </summary>
        [Fact]
        public void ConvertJsonSchemaToXsd()
        {
           // Moq.Mock<IRepository> moqRepository = new Mock<IRepository>();
            var schemaText = File.ReadAllText("Common/edag.schema.json");
            var schemaJson = JsonValue.Parse(schemaText);
            var schema = new JsonSerializer().Deserialize<JsonSchema>(schemaJson);

            JsonSchemaToXsd converter = new JsonSchemaToXsd();
            XmlSchema xmlSchema = converter.CreateXsd(schema);

            FileStream file = new FileStream("edag.generated.xsd", FileMode.Create, FileAccess.ReadWrite);
            XmlTextWriter xwriter = new XmlTextWriter(file, new UTF8Encoding());
            xwriter.Formatting = Formatting.Indented;
            xmlSchema.Write(xwriter);
        }
    }
}
