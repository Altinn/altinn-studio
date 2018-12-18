using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using AltinnCore.Common.Factories.ModelFactory;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Xunit;

namespace AltinnCore.UnitTest.Common
{
    /// <summary>
    /// Tests converting XSD to Json Schema
    /// </summary>
    public class XsdToJsonSchemaTest
    {
        /// <summary>
        /// Test converting edag XSD to Json Schema
        /// </summary>
        [Fact]
        public void EdagConvertToJsonSchema()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/Edag.xsd"));
            var schemaText = converter.AsJsonSchema();
        }

        /// <summary>
        /// Test converting ServiceModel XSD to Json Schema
        /// </summary>
        [Fact]
        public void ServicemodelConvertToJsonSchema()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/ServiceModel.xsd"));
            var schemaText = converter.AsJsonSchema();
        }
    }
}
