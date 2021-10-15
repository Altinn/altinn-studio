using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
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
        private JsonSchema _schema;
        private readonly IJsonSchemaAnalyzer _schemaAnalyzer;
        private JsonSchemaXsdMetadata _schemaXsdMetadata;

        private string ModelName { get; set; }

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

        ///
        /// <summary>
        /// Initializes a new instance of the <see cref="JsonSchemaToMetamodelConverter"/> class.
        /// </summary>
        /// <param name="schemaAnalyzer">An instance of <see cref="IJsonSchemaAnalyzer"/> used to analyze the various constructs used in the Schema.</param>
        public JsonSchemaToMetamodelConverter(IJsonSchemaAnalyzer schemaAnalyzer)
        {
            _schemaAnalyzer = schemaAnalyzer;
        }

        /// <summary>
        /// Converts a Json Schema string to a <see cref="ModelMetadata"/>
        /// </summary>
        /// <param name="modelName">The name of the model.</param>
        /// <param name="jsonSchema">The Json Schema to be converted</param>
        /// <returns>An flattened representation of the Json Schema in the form of <see cref="ModelMetadata"/></returns>
        public ModelMetadata Convert(string modelName, string jsonSchema)
        {
            ModelName = modelName;

            _modelMetadata = new ModelMetadata();
            _schema = JsonSchema.FromText(jsonSchema);
            var schemaUri = _schema.GetKeyword<IdKeyword>().Id;
            _schemaXsdMetadata = _schemaAnalyzer.AnalyzeSchema(_schema, schemaUri);

            ProcessSchema(_schema);

            return _modelMetadata;
        }

        private void ProcessSchema(JsonSchema schema)
        {
            var rootPath = JsonPointer.Parse("#");
            var name = ConvertToCSharpCompatibleName(ModelName);
            var context = new SchemaContext() { Id = name, ParentId = string.Empty, Name = name, XPath = "/" };

            foreach (var keyword in schema.Keywords)
            {
                var keywordPath = rootPath.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));
                ProcessKeyword(keywordPath, keyword, context);
            }
        }

        private void ProcessKeyword(JsonPointer path, IJsonSchemaKeyword keyword, SchemaContext context)
        {
            switch (keyword)
            {
                case SchemaKeyword:
                    break;

                case IdKeyword:
                    break;

                case TypeKeyword:
                    break;

                case ConstKeyword:
                    break;

                case XsdNamespacesKeyword:
                    break;

                case XsdSchemaAttributesKeyword:
                    break;

                case XsdUnhandledAttributesKeyword:
                    break;

                case XsdUnhandledEnumAttributesKeyword:
                    break;

                case XsdTypeKeyword:
                    break;

                case XsdAttributeKeyword:
                    break;

                case XsdAnyAttributeKeyword:
                    break;

                case InfoKeyword:
                    break;

                case DefinitionsKeyword k:
                    //ProcessDefinitionsKeyword(path, k, context);
                    break;

                case DefsKeyword k:                    
                    //ProcessDefsKeyword(path, k, context);
                    break;

                case RefKeyword k:
                    ProcessRefKeyword(path, k, context);
                    break;

                case OneOfKeyword k:
                    ProcessOneOfKeyword(path, k, context);
                    break;

                case AllOfKeyword k:
                    ProcessAllOfKeyword(path, k, context);
                    break;

                case AnyOfKeyword k:
                    ProcessAnyOfKeyword(path, k, context);
                    break;

                case PropertiesKeyword k:
                    ProcessPropertiesKeyword(path, k, context);
                    break;

                case EnumKeyword k:
                    ProcessEnumKeyword(path, k, context);
                    break;

                case RequiredKeyword:
                    break;

                default:
                    throw new NotImplementedException($"Keyword {keyword.Keyword()} not processed!");
            }

            OnKeywordProcessed(new KeywordProcessedEventArgs() { Path = path, Keyword = keyword });
        }

        private void ProcessDefinitionsKeyword(JsonPointer path, DefinitionsKeyword keyword, SchemaContext context)
        {
            ProcessDefinitons(path, keyword.Definitions, context);
        }

        private void ProcessDefsKeyword(JsonPointer path, DefsKeyword keyword, SchemaContext context)
        {
            ProcessDefinitons(path, keyword.Definitions, context);
        }

        private void ProcessDefinitons(JsonPointer path, IReadOnlyDictionary<string, JsonSchema> definitions, SchemaContext context)
        {
            foreach (var (name, definition) in definitions)
            {
                var currentContext = new SchemaContext() { Id = CombineId(context.Id, name), Name = name, ParentId = context.Id, XPath = CombineXPath(context.XPath, context.Name) };
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/{name}"));

                ProcessSubSchema(subSchemaPath, definition, currentContext);
            }
        }

        private void ProcessRefKeyword(JsonPointer path, RefKeyword keyword, SchemaContext context)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.GetSubschemas())
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ProcessSubSchema(subSchemaPath, subSchema, context);

                subSchemaIndex++;
            }
        }

        private void ProcessOneOfKeyword(JsonPointer path, OneOfKeyword keyword, SchemaContext context)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.GetSubschemas())
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ProcessSubSchema(subSchemaPath, subSchema, context);

                subSchemaIndex++;
            }
        }

        private void ProcessAnyOfKeyword(JsonPointer path, AnyOfKeyword keyword, SchemaContext context)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.GetSubschemas())
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ProcessSubSchema(subSchemaPath, subSchema, context);

                subSchemaIndex++;
            }
        }

        private void ProcessAllOfKeyword(JsonPointer path, AllOfKeyword keyword, SchemaContext context)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.GetSubschemas())
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ProcessSubSchema(subSchemaPath, subSchema, context);

                subSchemaIndex++;
            }         
        }

        private void ProcessPropertiesKeyword(JsonPointer path, PropertiesKeyword keyword, SchemaContext context)
        {
            foreach (var (name, property) in keyword.Properties)
            {
                var currentContext = new SchemaContext() { Id = CombineId(context.Id, name), Name = name, ParentId = context.Id, XPath = CombineXPath(context.XPath, context.Name) };
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/{name}"));
                ProcessSubSchema(subSchemaPath, property, currentContext);
            }
        }

        private void ProcessEnumKeyword(JsonPointer path, EnumKeyword k, SchemaContext context)
        {
            //TODO: do we need this?
        }

        private void ProcessSubSchema(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            if (IsPrimitiveType(subSchema))
            {
                ProcessPrimitiveType(path, subSchema, context);
            }
            else
            {
                ProcessNonPrimitiveType(path, subSchema, context);
            }

            OnSubSchemaProcessed(new SubSchemaProcessedEventArgs() { Path = path, SubSchema = subSchema });
        }

        private void ProcessNonPrimitiveType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            if (IsRefType(subSchema))
            {
                ProcessRefType(path, subSchema, context);
            }
            else if (IsEnumType(path))
            {
                ProcessEnumType(path, subSchema, context);
            }
            else if (IsNillableType(path))
            {
                ProcessNillableType(path, subSchema, context);
            }
            else
            {
                ProcessRegularType(path, subSchema, context);

                foreach (var keyword in subSchema.Keywords)
                {
                    var keywordPath = path.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));

                    ProcessKeyword(keywordPath, keyword, context);
                }
            }
        }

        private void ProcessNillableType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            var oneOfKeyword = subSchema.GetKeyword<OneOfKeyword>();
            var schema = oneOfKeyword.GetSubschemas().FirstOrDefault(s => !s.HasKeyword<TypeKeyword>());

            ProcessSubSchema(path, schema, context);
        }

        private void ProcessEnumType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            var allOfKeyword = subSchema.GetKeyword<AllOfKeyword>();

            var typeKeyword = allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<TypeKeyword>()).GetKeyword<TypeKeyword>();
            var enumSchema = allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<EnumKeyword>());

            context.SchemaValueType = typeKeyword.Type;

            AddElement(path, enumSchema, context);
        }

        private void ProcessPrimitiveType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            var typeKeyword = subSchema.GetKeyword<TypeKeyword>();

            if (typeKeyword == null)
            {
                return;
            }

            context.SchemaValueType = typeKeyword.Type;
            AddElement(path, subSchema, context);
        }

        private void ProcessRefType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            var refKeyword = subSchema.GetKeyword<RefKeyword>();
            var refPath = JsonPointer.Parse(refKeyword.Reference.ToString());
            var refSchema = _schema.FollowReference(refPath);

            ProcessSubSchema(refPath, refSchema, context);
        }

        private void ProcessRegularType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            var id = CombineId(context.ParentId, context.Name);

            if (PathAlreadyProcessed(path) || IdAlreadyAdded(id))
            {
                return;
            }

            var typeName = GetTypeNameFromRefPath(path);
            if (string.IsNullOrEmpty(typeName))
            {
                typeName = ConvertToCSharpCompatibleName(context.Name);
            }

            int minOccurs = GetMinOccurs(subSchema);
            int maxOccurs = GetMaxOccurs(subSchema);

            _modelMetadata.Elements.Add(
                id,
                new ElementMetadata()
                {
                    ID = id,
                    Name = context.Name,
                    XName = ConvertToCSharpCompatibleName(context.Name),
                    TypeName = typeName,
                    ParentElement = string.IsNullOrEmpty(context.ParentId) ? null : context.ParentId,
                    XPath = CombineXPath(context.XPath, context.Name),
                    JsonSchemaPointer = path.Source,
                    MinOccurs = minOccurs,
                    MaxOccurs = maxOccurs,
                    Type = ElementType.Group,
                    Restrictions = GetRestrictions(MapToXsdValueType(context.SchemaValueType), subSchema),
                    DisplayString = GetDisplayString(id, typeName, minOccurs, maxOccurs)
                });
        }

        private static string GetDisplayString(string id, string typeName, int minOccurs, int maxOccurs)
        {
            return $"{id} : [{minOccurs}..{maxOccurs}] {typeName}";
        }

        private void ProcessStringPrimitiveType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {            
            AddElement(path, subSchema, context);
        }

        private void AddElement(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            var id = CombineId(context.ParentId, context.Name);

            if (PathAlreadyProcessed(path))
            {
                return;
            }

            var typeName = ConvertToCSharpCompatibleName(context.Name);
            int minOccurs = GetMinOccurs(subSchema);
            int maxOccurs = GetMaxOccurs(subSchema);

            _modelMetadata.Elements.Add(
                context.Id,
                new ElementMetadata()
                {
                    ID = id,
                    Name = context.Name,
                    XName = ConvertToCSharpCompatibleName(context.Name),
                    TypeName = typeName,
                    ParentElement = string.IsNullOrEmpty(context.ParentId) ? null : context.ParentId,
                    XsdValueType = MapToXsdValueType(context.SchemaValueType),
                    XPath = CombineXPath(context.XPath, context.Name),
                    JsonSchemaPointer = path.Source,
                    MinOccurs = minOccurs,
                    MaxOccurs = maxOccurs,
                    Type = GetType(subSchema),
                    Restrictions = GetRestrictions(MapToXsdValueType(context.SchemaValueType), subSchema),
                    FixedValue = GetFixedValue(subSchema),
                    DisplayString = GetDisplayString(id, context.SchemaValueType.ToString(), minOccurs, maxOccurs)
                });
        }

        private static string GetFixedValue(JsonSchema subSchema)
        {
            var constKeyword = subSchema.GetKeyword<ConstKeyword>();
            if (constKeyword != null)
            {
                return constKeyword.Value.GetString();
            }

            return null;
        }

        private static ElementType GetType(JsonSchema subSchema)
        {
            var xsdAttributeTypeKeyword = subSchema.GetKeyword<XsdAttributeKeyword>();
            if (xsdAttributeTypeKeyword?.Value == true)
            {
                return ElementType.Attribute;
            }

            return ElementType.Field;
        }

        private Dictionary<string, Restriction> GetRestrictions(BaseValueType? xsdValueType, JsonSchema subSchema)
        {
            var restrictions = new Dictionary<string, Restriction>();
            if (xsdValueType == null)
            {
                return restrictions;
            }

            switch (xsdValueType)
            {
                case BaseValueType.String:
                    AddStringRestrictions(subSchema, restrictions);
                    break;
            }

            return restrictions;
        }

        private static void AddStringRestrictions(JsonSchema subSchema, Dictionary<string, Restriction> restrictions)
        {
            var enumKeyword = subSchema.GetKeyword<EnumKeyword>();
            if (enumKeyword == null)
            {
                return;
            }

            string value = string.Empty;
            foreach (var @enum in enumKeyword.Values)
            {
                if (value.Length > 0)
                {
                    value += ";";
                }

                value += @enum.GetString();
            }

            restrictions.Add("enumeration", new Restriction() { Value = value });
        }

        private bool IsNillableType(JsonPointer path)
        {
            return _schemaXsdMetadata.GetCompatibleTypes(path).Contains(CompatibleXsdType.Nillable);
        }

        private bool IsEnumType(JsonPointer path)
        {
            return _schemaXsdMetadata.GetCompatibleTypes(path).Contains(CompatibleXsdType.SimpleTypeRestriction);
        }

        private bool PathAlreadyProcessed(JsonPointer path)
        {
            return _modelMetadata.Elements.FirstOrDefault(e => e.Value.JsonSchemaPointer == path.Source).Value != null;
        }

        private bool IdAlreadyAdded(string id)
        {
            return _modelMetadata.Elements.FirstOrDefault(e => e.Key == id).Value != null;
        }

        private static int GetMinOccurs(JsonSchema subSchema)
        {
            var minItemsKeyword = subSchema.GetKeyword<MinItemsKeyword>();
            return minItemsKeyword == null ? 0 : (int)minItemsKeyword.Value;
        }

        private static int GetMaxOccurs(JsonSchema subSchema)
        {
            var maxitemsKeyword = subSchema.GetKeyword<MaxItemsKeyword>();
            return maxitemsKeyword == null ? 1 : (int)maxitemsKeyword.Value;
        }

        private static string CombineId(string parentId, string elementName)
        {
            return string.IsNullOrEmpty(parentId) ? elementName : $"{parentId}.{elementName}";
        }

        private static string CombineXPath(string baseXPath, string name)
        {
            return (baseXPath == "/") ? $"/{name}" : $"{baseXPath}/{name}";
        }

        private static BaseValueType? MapToXsdValueType(SchemaValueType jsonValueType)
        {
            switch (jsonValueType)
            {
                case SchemaValueType.String:
                    return BaseValueType.String;
                case SchemaValueType.Boolean:
                    return BaseValueType.Boolean;
                case SchemaValueType.Number:
                    return BaseValueType.Decimal;
                case SchemaValueType.Integer:
                    return BaseValueType.Integer;
                default:
                    return null;
            }
        }

        private static string GetTypeNameFromRef(JsonSchema subSchema)
        {
            var refKeyword = subSchema.GetKeyword<RefKeyword>();

            var pointer = JsonPointer.Parse(refKeyword.Reference.ToString());

            var typeName = GetTypeNameFromRefPath(pointer);

            if (string.IsNullOrEmpty(typeName))
            {
                throw new ArgumentException("Reference uri must point to a definition in $defs/definitions to be used as TypeName");
            }

            return typeName;
        }

        private static string GetTypeNameFromRefPath(JsonPointer pointer)
        {
            if (pointer.Segments.Length != 2 || (pointer.Segments[0].Value != "$defs" && pointer.Segments[0].Value != "definitions"))
            {
                return string.Empty;
            }

            return pointer.Segments[1].Value;
        }

        private static bool IsRefType(JsonSchema subSchema)
        {
            var refkeyword = subSchema.GetKeyword<RefKeyword>();

            return refkeyword != null;
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

        private static string ConvertToCSharpCompatibleName(string name)
        {
            if (string.IsNullOrEmpty(name))
            {
                return null;
            }

            return name.Replace("-", string.Empty);
        }

        private class SchemaContext
        {
            public string Id { get; set; }

            public string ParentId { get; set; }

            public string Name { get; set; }

            public string XPath { get; set; }

            public SchemaValueType SchemaValueType { get; set; }
        }
    }
}
