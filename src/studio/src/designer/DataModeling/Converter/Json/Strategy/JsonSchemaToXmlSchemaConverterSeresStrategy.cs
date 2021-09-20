using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public class JsonSchemaToXmlSchemaConverterSeresStrategy : IJsonSchemaToXmlSchemaConverterStrategy
    {
        /// <inheritdoc />
        public IJsonSchemaAnalyzer GetAnalyzer()
        {
            return new JsonSchemaSeresAnalyzer();
        }

        /// <inheritdoc />
        public IJsonSchemaConverter GetConverter()
        {
            return new JsonSchemaGeneralConverter();
        }
    }
}
