using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Factory class for finding the right implementation of <see cref="IJsonSchemaConverterStrategy"/> to
    /// use when converting a Json Schema to XSD.
    /// </summary>
    public static class JsonSchemaConverterStrategyFactory
    {
        /// <summary>
        /// Select converting strategy based on simple analysis of schema information, will chose one of SERES, OR og General strategies
        /// </summary>
        /// <returns></returns>
        public static IJsonSchemaConverterStrategy SelectStrategy(JsonSchema jsonSchema)
        {
            if (jsonSchema.TryGetKeyword(out XsdNamespacesKeyword namespaces))
            {
                foreach ((_, string ns) in namespaces.Namespaces)
                {
                    if (ns.Equals(KnownXmlNamespaces.SERES, StringComparison.InvariantCultureIgnoreCase))
                    {
                        return new SeresJsonSchemaConverterStrategy();
                    }

                    if (ns.Equals(KnownXmlNamespaces.OR, StringComparison.InvariantCultureIgnoreCase))
                    {
                        return new OrJsonSchemaConverterStrategy();
                    }
                }
            }

            if (jsonSchema.TryGetKeyword(out InfoKeyword info))
            {
                JsonElement value = info.Value;
                if (value.ValueKind == JsonValueKind.Object)
                {
                    JsonElement generatorScriptName = value.EnumerateObject().FirstOrDefault(obj => obj.NameEquals("XSLT-skriptnavn")).Value;
                    if (generatorScriptName.ValueKind == JsonValueKind.String &&
                        generatorScriptName.ValueEquals("SERES_XSD_GEN"))
                    {
                        return new SeresJsonSchemaConverterStrategy();
                    }
                }
            }

            return new GeneralJsonSchemaConverterStrategy();
        }
    }
}
