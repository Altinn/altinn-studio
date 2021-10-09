using System;
using System.Linq;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
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
        /// Event raised when a subschema is processed.
        /// </summary>
        public event EventHandler<SubSchemaProcessedEventArgs> SubSchemaProcessed;

        /// <summary>
        /// Handler for the <see cref="KeywordProcessed"/> event.
        /// </summary>
        protected virtual void OnKeywordProcessed(KeywordProcessedEventArgs e)
        {
            EventHandler<KeywordProcessedEventArgs> handler = KeywordProcessed;
            handler?.Invoke(this, e);
        }

        /// <summary>
        /// Handler for the <see cref="SubSchemaProcessed"/> event.
        /// </summary>
        protected virtual void OnSubSchemaProcessed(SubSchemaProcessedEventArgs e)
        {
            EventHandler<SubSchemaProcessedEventArgs> handler = SubSchemaProcessed;
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
                var keywordPath = path.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));
                ProcessKeyword(keywordPath, keyword);
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

                case XsdTypeKeyword:
                    break;

                case InfoKeyword:
                    break;

                case DefinitionsKeyword k:
                    ProcessDefinitionsKeyword(path, k);
                    break;

                case DefsKeyword k:                    
                    ProcessDefsKeyword(path, k);
                    break;

                case RefKeyword k:
                    ProcessRefKeyword(path, k);
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

                case RequiredKeyword:
                    break;

                default:
                    throw new NotImplementedException($"Keyword {keyword.Keyword()} not processed!");
                    break;
            }

            OnKeywordProcessed(new KeywordProcessedEventArgs() { Path = path, Keyword = keyword });
        }

        private void ProcessDefinitionsKeyword(JsonPointer path, DefinitionsKeyword keyword)
        {
            foreach (var (name, definition) in keyword.Definitions)
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/{name}"));
                ProcessSubSchema(subSchemaPath, definition);
            }
        }

        private void ProcessDefsKeyword(JsonPointer path, DefsKeyword keyword)
        {
            foreach (var (name, definition) in keyword.Definitions)
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/{name}"));
                ProcessSubSchema(subSchemaPath, definition);
            }
        }

        private void ProcessRefKeyword(JsonPointer path, RefKeyword keyword)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.GetSubschemas())
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ProcessSubSchema(subSchemaPath, subSchema);

                subSchemaIndex++;
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
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/{name}"));
                ProcessSubSchema(subSchemaPath, property);
            }
        }

        private void ProcessSubSchema(JsonPointer path, JsonSchema subSchema)
        {
            foreach (var keyword in subSchema.Keywords)
            {
                var keywordPath = path.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));
                ProcessKeyword(keywordPath, keyword);
            }

            if (IsPrimitiveType(subSchema))
            {
                ProcessPrimitiveType(path, subSchema);   
            }

            OnSubSchemaProcessed(new SubSchemaProcessedEventArgs() { Path = path, SubSchema = subSchema });
        }

        private void ProcessPrimitiveType(JsonPointer path, JsonSchema subSchema)
        {
            var typeKeyword = subSchema.GetKeyword<TypeKeyword>();

            if (typeKeyword == null)
            {
                return;
            }

            switch (typeKeyword.Type)
            {
                case SchemaValueType.Boolean:
                    break;

                case SchemaValueType.Integer:
                    break;

                case SchemaValueType.Number:
                    break;

                case SchemaValueType.String:
                    ProcessStringPrimitiveType(path, subSchema);
                    break;

                default:
                    return;
            }
        }

        private void ProcessStringPrimitiveType(JsonPointer path, JsonSchema jsonSchema)
        {
            _modelMetadata.Elements.Add(path.Source, new ElementMetadata() { Name = path.Segments.Last().Source });
        }

        private static bool IsPrimitiveType(JsonSchema subSchema)
        {
            var typeKeyword = subSchema.GetKeyword<TypeKeyword>();

            if (typeKeyword == null)
            {
                return false;
            }

            switch (typeKeyword.Type)
            {
                case SchemaValueType.Boolean:
                case SchemaValueType.Integer:
                case SchemaValueType.Number:
                case SchemaValueType.String:
                    return true;
                default:
                    return false;
            }
        }
    }
}
