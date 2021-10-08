using System;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.Designer.Factories.ModelFactory
{
    /// <summary>
    /// Class for converting from a Json Schema to a <see cref="ModelMetadata"/> instance.
    /// </summary>
    public class JsonSchemaToMetamodelConverter
    {
        private ModelMetadata _modelMetadata;

        /// <summary>
        /// Event raised when a keyword is processed.
        /// </summary>
        public event EventHandler<KeywordProcessedEventArgs> KeywordProcessed;

        /// <summary>
        /// Handler for the <see cref="KeywordProcessed"/> event.
        /// </summary>
        protected virtual void OnKeywordProcessed(KeywordProcessedEventArgs e)
        {
            EventHandler<KeywordProcessedEventArgs> handler = KeywordProcessed;
            handler?.Invoke(this, e);
        }

        /// <summary>
        /// Converts a Json Schema string to a <see cref="ModelMetadata"/>
        /// </summary>
        /// <param name="jsonSchema">The Json Schema to be converted</param>
        /// <returns>An flattened representation of the Json Schema in the form of <see cref="ModelMetadata"/></returns>
        public ModelMetadata Convert(string jsonSchema)
        {
            _modelMetadata = new ModelMetadata();
            
            var schema = JsonSchema.FromText(jsonSchema);

            ProcessSchema(schema);

            return _modelMetadata;
        }

        private void ProcessSchema(JsonSchema schema)
        {
            var path = JsonPointer.Parse("#");

            foreach (var keyword in schema.Keywords)
            {
                ProcessKeyword(path.Combine(JsonPointer.Parse($"/{keyword.Keyword()}")), keyword);
            }
        }

        private void ProcessKeyword(JsonPointer path, IJsonSchemaKeyword keyword)
        {
            switch (keyword)
            {
                case SchemaKeyword:
                    break;

                case IdKeyword:
                    break;

                case TypeKeyword:
                    break;

                case XsdNamespacesKeyword:
                    break;

                case XsdSchemaAttributesKeyword:
                    break;

                case InfoKeyword:
                    break;

                case DefinitionsKeyword k:
                    ProcessDefinitions(path, k);
                    break;

                case DefsKeyword k:                    
                    ProcessDefs(path, k);
                    break;

                case OneOfKeyword k:
                    ProcessOneOfKeyword(path, k);
                    break;

                case AllOfKeyword k:
                    ProcessAllOfKeyword(path, k);
                    break;

                case AnyOfKeyword k:
                    ProcessAnyOfKeyword(path, k);
                    break;

                case PropertiesKeyword k:
                    ProcessPropertiesKeyword(path, k);
                    break;

                default:
                    break;
            }

            OnKeywordProcessed(new KeywordProcessedEventArgs() { Path = path, Keyword = keyword });
        }

        private void ProcessDefinitions(JsonPointer path, DefinitionsKeyword keyword)
        {
            foreach (var (name, definition) in keyword.Definitions)
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/{name}"));
                ProcessSubSchema(subSchemaPath, definition);
            }
        }

        private void ProcessDefs(JsonPointer path, DefsKeyword keyword)
        {
            foreach (var (name, definition) in keyword.Definitions)
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/{name}"));
                ProcessSubSchema(subSchemaPath, definition);
            }
        }

        private void ProcessOneOfKeyword(JsonPointer path, OneOfKeyword keyword)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.GetSubschemas())
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ProcessSubSchema(subSchemaPath, subSchema);

                subSchemaIndex++;
            }
        }

        private void ProcessAnyOfKeyword(JsonPointer path, AnyOfKeyword keyword)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.GetSubschemas())
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ProcessSubSchema(subSchemaPath, subSchema);

                subSchemaIndex++;
            }
        }

        private void ProcessAllOfKeyword(JsonPointer path, AllOfKeyword keyword)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.GetSubschemas())
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ProcessSubSchema(subSchemaPath, subSchema);

                subSchemaIndex++;
            }
        }

        private void ProcessPropertiesKeyword(JsonPointer path, PropertiesKeyword keyword)
        {
            foreach (var (name, property) in keyword.Properties)
            {
                ProcessSubSchema(path.Combine(JsonPointer.Parse($"/{name}")), property);
            }
        }

        private void ProcessSubSchema(JsonPointer path, JsonSchema subSchema)
        {
            foreach (var keyword in subSchema.Keywords)
            {
                var keywordPath = path.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));
                ProcessKeyword(keywordPath, keyword);
            }
        }
    }
}
