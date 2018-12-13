using AltinnCore.Common.Factories.ModelFactory;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using Xunit;

namespace AltinnCore.UnitTest.Common
{
    public class XsdToJsonSchemaTest
    {

        [Fact]
        public void edagConvertToJsonSchema()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/Edag.xsd"));
            var schemaText = converter.asJsonSchema();
        }

        [Fact]
        public void servicemodelConvertToJsonSchema()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/ServiceModel.xsd"));
            var schemaText = converter.asJsonSchema();
        }
    }
}
