using System.Collections.Generic;
using System.Text.Json;
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
        /// Add <see cref="InfoKeyword"/> keyword to the builder
        /// </summary>
        /// <param name="builder">The <see cref="JsonSchemaBuilder"/></param>
        /// <param name="info">Info content as <see cref="JsonElement" /></param>
        /// <returns>The <see cref="JsonSchemaBuilder"/> used for chaining</returns>
        public static JsonSchemaBuilder Info(this JsonSchemaBuilder builder, JsonElement info)
        {
            builder.Add(new InfoKeyword(info));
            return builder;
        }

        /// <summary>
        /// Add <see cref="XsdAttributeKeyword"/> keyword to the builder
        /// </summary>
        /// <param name="builder">The <see cref="JsonSchemaBuilder"/></param>
        /// <param name="attribute">True to set the attribute keyword</param>
        /// <returns>The <see cref="JsonSchemaBuilder"/> used for chaining</returns>
        public static JsonSchemaBuilder XsdAttribute(this JsonSchemaBuilder builder, bool attribute = true)
        {
            builder.Add(new XsdAttributeKeyword(attribute));
            return builder;
        }

        /// <summary>
        /// Add <see cref="XsdAnyAttributeKeyword"/> keyword to the builder
        /// </summary>
        /// <param name="builder">The <see cref="JsonSchemaBuilder"/></param>
        /// <param name="id">The original id of the any attribute.</param>
        /// <param name="namespace">The original namespace value of the any attribute.</param>
        /// <param name="processContent">The original processContent value of the any attribute.</param>
        /// <returns>The <see cref="JsonSchemaBuilder"/> used for chaining</returns>
        public static JsonSchemaBuilder XsdAnyAttribute(this JsonSchemaBuilder builder, string id, string @namespace, string processContent)
        {
            builder.Add(new XsdAnyAttributeKeyword(id, @namespace, processContent));
            return builder;
        }

        /// <summary>
        /// Add <see cref="XsdSchemaAttributesKeyword"/> keyword to the builder
        /// </summary>
        /// <param name="builder">The <see cref="JsonSchemaBuilder"/></param>
        /// <param name="attributes">Global xsd attributes</param>
        /// <returns>The <see cref="JsonSchemaBuilder"/> used for chaining</returns>
        public static JsonSchemaBuilder XsdSchemaAttributes(this JsonSchemaBuilder builder, params (string Name, string Value)[] attributes)
        {
            builder.Add(new XsdSchemaAttributesKeyword(attributes));
            return builder;
        }

        /// <summary>
        /// Add <see cref="XsdUnhandledAttributesKeyword"/> keyword to the builder
        /// </summary>
        /// <param name="builder">The <see cref="JsonSchemaBuilder"/></param>
        /// <param name="attributes">A list of unhandled attributes for the element</param>
        /// <returns>The <see cref="JsonSchemaBuilder"/> used for chaining</returns>
        public static JsonSchemaBuilder XsdUnhandledAttributes(this JsonSchemaBuilder builder, IEnumerable<(string Name, string Value)> attributes)
        {
            builder.Add(new XsdUnhandledAttributesKeyword(attributes));
            return builder;
        }

        /// <summary>
        /// Add <see cref="XsdUnhandledEnumAttributesKeyword"/> keyword to the builder
        /// </summary>
        /// <param name="builder">The <see cref="JsonSchemaBuilder"/></param>
        /// <param name="namedKeyValuePairsList">A list of named unhandled attributes for the enum values</param>
        /// <returns>The <see cref="JsonSchemaBuilder"/> used for chaining</returns>
        public static JsonSchemaBuilder XsdUnhandledEnumAttributes(this JsonSchemaBuilder builder, IEnumerable<NamedKeyValuePairs> namedKeyValuePairsList)
        {
            builder.Add(new XsdUnhandledEnumAttributesKeyword(namedKeyValuePairsList));
            return builder;
        }

        /// <summary>
        /// Add <see cref="XsdTypeKeyword"/> keyword to the builder
        /// </summary>
        /// <param name="builder">The <see cref="JsonSchemaBuilder"/></param>
        /// <param name="type">Xsd type specification</param>
        /// <returns>The <see cref="JsonSchemaBuilder"/> used for chaining</returns>
        public static JsonSchemaBuilder XsdType(this JsonSchemaBuilder builder, string type)
        {
            builder.Add(new XsdTypeKeyword(type));
            return builder;
        }

        /// <summary>
        /// Add <see cref="XsdStructureKeyword"/> keyword to the builder
        /// </summary>
        /// <param name="builder">The <see cref="JsonSchemaBuilder"/></param>
        /// <param name="value">The structure type; sequence, all, choice...</param>
        /// <returns>The <see cref="JsonSchemaBuilder"/> used for chaining</returns>
        public static JsonSchemaBuilder XsdStructure(this JsonSchemaBuilder builder, string value)
        {
            builder.Add(new XsdStructureKeyword(value));
            return builder;
        }

        /// <summary>
        /// Add <see cref="XsdRestrictionsKeyword"/> keyword to the builder
        /// </summary>
        /// <param name="builder">The <see cref="JsonSchemaBuilder"/></param>
        /// <param name="restrictions">A list of restrictions from the xml schema</param>
        /// <returns>The <see cref="JsonSchemaBuilder"/> used for chaining</returns>
        public static JsonSchemaBuilder XsdRestrictions(this JsonSchemaBuilder builder, IEnumerable<(string Name, JsonElement Value)> restrictions)
        {
            builder.Add(new XsdRestrictionsKeyword(restrictions));
            return builder;
        }

        /// <summary>
        /// Add <see cref="XsdNamespacesKeyword"/> keyword to the builder
        /// </summary>
        /// <param name="builder">The <see cref="JsonSchemaBuilder"/></param>
        /// <param name="namespaces">The namespaces declared at the root level of the xml schema</param>
        /// <returns>The <see cref="JsonSchemaBuilder"/> used for chaining</returns>
        public static JsonSchemaBuilder XsdNamespaces(this JsonSchemaBuilder builder, IEnumerable<(string Name, string Ns)> namespaces)
        {
            builder.Add(new XsdNamespacesKeyword(namespaces));
            return builder;
        }
    }
}
