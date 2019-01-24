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

                XsdToJsonSchema converter;
                JsonValue schemaText;
                try
                {
                    converter = new XsdToJsonSchema(new XmlTextReader(file), TestLogger.Create<XsdToJsonSchema>());
                    schemaText = converter.AsJsonValue();
                }
                catch (Exception e)
                {
                    _logger.LogError("Failed converting file " + file + ": " + e.Message);
                    failCount++;
                }
            }

            Assert.Equal(0, failCount);
        }
    }
}
