using System;
using System.Collections.Generic;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json
{
    /// <summary>
    /// Class for normalizing and simplifying the structure of a JSON Schema
    /// without affecting validation.
    /// </summary>
    public class JsonSchemaNormalizer : IJsonSchemaNormalizer
    {
        /// <summary>
        /// Turns on and off normalization. With NoNormalization = true you should
        /// get the same schema back. This is primarily used for testing to make
        /// sure all keywords and properties are handled.
        /// </summary>
        public bool NoNormalization { get; set; } = false;

        /// <summary>
        /// Normalizes a JSON Schema by simplyfying nested hierarchies.
        /// JSON documents will still validate as the simplified hierarchies
        /// does not affect schema validation.
        /// </summary>
        /// <returns>A new normalized JSON Schema.</returns>
        public JsonSchema Normalize(JsonSchema jsonSchema)
        {
            var schemaBuilder = new JsonSchemaBuilder();
            TraverseSubschema(jsonSchema, schemaBuilder);

            return schemaBuilder.Build();
        }

        private void TraverseSubschema(JsonSchema sourceSchema, JsonSchemaBuilder subSchemaBuilder)
        {
            foreach (var keyword in sourceSchema.Keywords)
            {
                TraverseKeyword(keyword, subSchemaBuilder);
            }
        }

        private void TraverseKeyword(IJsonSchemaKeyword keyword, JsonSchemaBuilder schemaBuilder)
        {
            switch (keyword)
            {
                case PropertiesKeyword propertiesKeyword:
                    HandlePropertiesKeyword(propertiesKeyword, schemaBuilder);
                    break;
                case AllOfKeyword:
                    HandleAllOfKeyword(keyword, schemaBuilder);
                    break;
                default:
                    schemaBuilder.Add(keyword);
                    break;
            }
        }

        private void HandleAllOfKeyword(IJsonSchemaKeyword keyword, JsonSchemaBuilder schemaBuilder)
        {
            var subSchemaDictionary = new Dictionary<string, JsonSchema>();
            foreach (var subSchema in keyword.GetSubschemas())
            {
                var subSchemaBuilder = new JsonSchemaBuilder();
                TraverseSubschema(subSchema, subSchemaBuilder);

                // Could consider building up a path to the node and use that
                // as key instead on the Guid.NewGuid(), but not needed for now.
                subSchemaDictionary.Add(Guid.NewGuid().ToString(), subSchemaBuilder.Build());
            }

            schemaBuilder.Add(new AllOfKeyword(subSchemaDictionary.Values));
        }

        private void HandlePropertiesKeyword(PropertiesKeyword propertiesKeyword, JsonSchemaBuilder schemaBuilder)
        {
            var subSchemaDictionary = new Dictionary<string, JsonSchema>();
            foreach (var property in propertiesKeyword.Properties)
            {
                var subSchemaBuilder = new JsonSchemaBuilder();
                TraverseSubschema(property.Value, subSchemaBuilder);
                subSchemaDictionary.Add(property.Key, subSchemaBuilder.Build());
            }

            schemaBuilder.Add(new PropertiesKeyword(subSchemaDictionary));
        }
    }
}
