using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using AltinnCore.Common.Factories.ModelFactory;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Microsoft.Extensions.Logging;
using NUnit.Framework;
using Xunit;

namespace AltinnCore.UnitTest.Common
{
    /// <summary>
    /// Tests converting XSD to Json Schema
    /// </summary>
    public class XsdToJsonSchemaTest
    {
        private ILogger _logger = TestLogger.Create<XsdToJsonSchemaTest>();

        private static bool writeDifferXsdFiles = false;

        /// <summary>
        /// Test converting all provided XSDs to Json Schema
        /// </summary>
        [Fact]
        public void ConvertXSDsToJsonSchema()
        {
            int failCount = 0;

            string[] files = Directory.GetFiles("Common/xsd", "*.xsd", SearchOption.AllDirectories);

            foreach (string file in files)
            {
                _logger.LogInformation("Converting file " + file + " to Json Schema");

                try
                {
                    // XSD to Json Schema
                    XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(new XmlTextReader(file), TestLogger.Create<XsdToJsonSchema>());
                    JsonSchema schemaJsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

                    // Json Schema to XSD
                    JsonSchemaToXsd jsonSchemaToXsdConverter = new JsonSchemaToXsd();
                    XmlSchema xmlSchema = jsonSchemaToXsdConverter.CreateXsd(schemaJsonSchema);

                    // Load original file as XDocument
                    XDocument original = XDocument.Load(file);

                    // Load converted file as XDocument
                    XDocument converted;
                    StringBuilder sb = new StringBuilder();
                    using (XmlWriter writer = XmlWriter.Create(sb))
                    {
                        xmlSchema.Write(writer);
                        converted = XDocument.Load(new StringReader(sb.ToString()));
                    }

                    // Compare XDocuments
                    bool xsdsAreEqual = XNode.DeepEquals(original, converted);
                    if (!xsdsAreEqual && writeDifferXsdFiles)
                    {
                        File.Copy(file, "c:\\temp\\original.xsd", true);
                        SaveJsonSchema(schemaJsonSchema, "c:\\temp\\converted.schema.json");
                        SaveXmlSchema(xmlSchema, "c:\\temp\\converted.xsd");
                    }

                    /*Assert.True(xsdsAreEqual);*/
                }
                catch (Exception e)
                {
                    _logger.LogError("Failed converting file " + file + ": " + e.Message);
                    failCount++;
                }
            }

            Assert.Equal(0, failCount);
        }

        private void SaveXmlSchema(XmlSchema xmlSchema, string fileName)
        {
            FileStream file = new FileStream(fileName, FileMode.Create, FileAccess.ReadWrite);
            using (XmlTextWriter xwriter = new XmlTextWriter(file, Encoding.UTF8) { Formatting = Formatting.Indented })
            {
                xmlSchema.Write(xwriter);
            }
        }

        private void SaveJsonSchema(JsonSchema jsonSchema, string fileName)
        {
            File.WriteAllText(fileName, new JsonSerializer().Serialize<JsonSchema>(jsonSchema).ToString(), Encoding.UTF8);
        }
    }
}
