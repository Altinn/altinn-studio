using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Utils
{
    /// <summary>
    /// Extension methods for working with xsd custom keyword on <see cref="JsonSchemaBuilder"/>
    /// </summary>
    public static class JsonSchemaXsdExtensions
    {
        /// <summary>
        /// Add info keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder Info(this JsonSchemaBuilder builder, JsonElement info)
        {
            builder.Unrecognized("info", JsonNode.Parse(info.GetRawText()));
            return builder;
        }

        /// <summary>
        /// Add @xsdAttribute keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdAttribute(this JsonSchemaBuilder builder, bool attribute = true)
        {
            builder.Unrecognized("@xsdAttribute", JsonValue.Create(attribute));
            return builder;
        }

        /// <summary>
        /// Add @xsdAnyAttribute keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdAnyAttribute(
            this JsonSchemaBuilder builder,
            string id,
            string @namespace,
            string processContent
        )
        {
            var obj = new JsonObject();
            if (id != null)
            {
                obj["Id"] = id;
            }

            if (@namespace != null)
            {
                obj["Namespace"] = @namespace;
            }

            if (processContent != null)
            {
                obj["ProcessContent"] = processContent;
            }

            builder.Unrecognized("@xsdAnyAttribute", obj);
            return builder;
        }

        /// <summary>
        /// Add @xsdSchemaAttributes keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdSchemaAttributes(
            this JsonSchemaBuilder builder,
            params (string Name, string Value)[] attributes
        )
        {
            var obj = new JsonObject();
            foreach (var (name, value) in attributes)
            {
                obj[name] = value;
            }

            builder.Unrecognized("@xsdSchemaAttributes", obj);
            return builder;
        }

        /// <summary>
        /// Add @xsdUnhandledAttributes keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdUnhandledAttributes(
            this JsonSchemaBuilder builder,
            IEnumerable<(string Name, string Value)> attributes
        )
        {
            var obj = new JsonObject();
            foreach (var (name, value) in attributes)
            {
                obj[name] = value;
            }

            builder.Unrecognized("@xsdUnhandledAttributes", obj);
            return builder;
        }

        /// <summary>
        /// Add @xsdUnhandledEnumAttributes keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdUnhandledEnumAttributes(
            this JsonSchemaBuilder builder,
            IEnumerable<NamedKeyValuePairs> namedKeyValuePairsList
        )
        {
            var obj = new JsonObject();
            foreach (var item in namedKeyValuePairsList)
            {
                var innerObj = new JsonObject();
                foreach (var pair in item.Properties)
                {
                    innerObj[pair.Key] = pair.Value;
                }

                obj[item.Name] = innerObj;
            }

            builder.Unrecognized("@xsdUnhandledEnumAttributes", obj);
            return builder;
        }

        /// <summary>
        /// Add @xsdType keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdType(this JsonSchemaBuilder builder, string type)
        {
            builder.Unrecognized("@xsdType", JsonValue.Create(type));
            return builder;
        }

        /// <summary>
        /// Add @xsdStructure keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdStructure(this JsonSchemaBuilder builder, string value)
        {
            builder.Unrecognized("@xsdStructure", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Add @xsdRestrictions keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdRestrictions(
            this JsonSchemaBuilder builder,
            IEnumerable<(string Name, JsonElement Value)> restrictions
        )
        {
            var obj = new JsonObject();
            foreach (var (name, value) in restrictions)
            {
                obj[name] = JsonNode.Parse(value.GetRawText());
            }

            builder.Unrecognized("@xsdRestrictions", obj);
            return builder;
        }

        /// <summary>
        /// Add @xsdNamespaces keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdNamespaces(
            this JsonSchemaBuilder builder,
            IEnumerable<(string Name, string Ns)> namespaces
        )
        {
            var obj = new JsonObject();
            foreach (var (name, ns) in namespaces)
            {
                obj[name] = ns;
            }

            builder.Unrecognized("@xsdNamespaces", obj);
            return builder;
        }

        /// <summary>
        /// Add @xsdText keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdText(this JsonSchemaBuilder builder, bool value = false)
        {
            builder.Unrecognized("@xsdText", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Add formatExclusiveMinimum keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder FormatExclusiveMinimum(this JsonSchemaBuilder builder, string value)
        {
            builder.Unrecognized("formatExclusiveMinimum", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Add formatMinimum keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder FormatMinimum(this JsonSchemaBuilder builder, string value)
        {
            builder.Unrecognized("formatMinimum", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Add formatExclusiveMaximum keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder FormatExclusiveMaximum(this JsonSchemaBuilder builder, string value)
        {
            builder.Unrecognized("formatExclusiveMaximum", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Add formatMaximum keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder FormatMaximum(this JsonSchemaBuilder builder, string value)
        {
            builder.Unrecognized("formatMaximum", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Adds @xsdMinOccurs keyword to builder
        /// </summary>
        public static JsonSchemaBuilder XsdMinOccurs(this JsonSchemaBuilder builder, int value)
        {
            builder.Unrecognized("@xsdMinOccurs", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Adds @xsdMaxOccurs keyword to builder
        /// </summary>
        public static JsonSchemaBuilder XsdMaxOccurs(this JsonSchemaBuilder builder, string value)
        {
            builder.Unrecognized("@xsdMaxOccurs", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Adds totalDigits keyword to builder
        /// </summary>
        public static JsonSchemaBuilder XsdTotalDigits(this JsonSchemaBuilder builder, uint value)
        {
            builder.Unrecognized("totalDigits", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Adds @xsdRootElement keyword to builder
        /// </summary>
        public static JsonSchemaBuilder XsdRootElement(this JsonSchemaBuilder builder, string value)
        {
            builder.Unrecognized("@xsdRootElement", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Add @xsdNillable keyword to the builder
        /// </summary>
        public static JsonSchemaBuilder XsdNillable(this JsonSchemaBuilder builder, bool value = false)
        {
            builder.Unrecognized("@xsdNillable", JsonValue.Create(value));
            return builder;
        }

        /// <summary>
        /// Adds @xsdAny keyword to builder
        /// </summary>
        public static JsonSchemaBuilder XsdAny(this JsonSchemaBuilder builder, IEnumerable<string> values)
        {
            var array = new JsonArray();
            foreach (var v in values)
            {
                array.Add(JsonValue.Create(v));
            }

            builder.Unrecognized("@xsdAny", array);
            return builder;
        }
    }
}
