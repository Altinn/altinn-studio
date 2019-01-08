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
            int d = 0;
        }

        /// <summary>
        /// Test converting ServiceModel XSD to Json Schema
        /// </summary>
        [Fact]
        public void ServicemodelConvertToJsonSchema()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/ServiceModel.xsd"));
            var schemaText = converter.AsJsonSchema();
            int d = 0;
        }

        /// <summary>
        /// Test converting BoligsparingForUngdom XSD to Json Schema
        /// </summary>
        [Fact]
        public void BoligsparingForUngdomConvertToJsonSchema()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/boligsparingForUngdom_v1_1.xsd"));
            var schemaText = converter.AsJsonSchema();
            int d = 0;
        }

        /// <summary>
        /// Test converting Motorvognavgift XSD to Json Schema
        /// </summary>
        [Fact]
        public void MotorvognavgiftConvertToJsonSchema()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/motorvognavgift-v4.xsd"));
            var schemaText = converter.AsJsonSchema();
            int d = 0;
        }

        /// <summary>
        /// Test converting Skattemelding XSD to Json Schema
        /// </summary>
        [Fact]
        public void SkattemeldingConvertToJsonSchema()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/Skattemelding_v6.25.xsd"));
            var schemaText = converter.AsJsonSchema();
            int d = 0;
        }

        /// <summary>
        /// Test converting Recursion XSD to Json Schema
        /// </summary>
        [Fact]
        public void RecursionConvertToJsonSchema()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/schema-w-recursion.xsd"));
            var schemaText = converter.AsJsonSchema();
            int d = 0;
        }
    }
}
