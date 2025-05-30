using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;
using static Altinn.Studio.DataModeling.Converter.Metadata.MetamodelRestrictionUtils;

namespace Altinn.Studio.DataModeling.Converter.Metadata
{
    /// <summary>
    /// Class for converting from a Json Schema to a <see cref="ModelMetadata"/> instance.
    /// </summary>
    public class JsonSchemaToMetamodelConverter
    {
        // Parameter class used to group parameters
        // related to the context of the schema to process.
        private sealed class SchemaContext
        {
            public string Id { get; set; }

            public string ParentId { get; set; }

            public string Name { get; set; }

            public string XPath { get; set; }

            public SchemaValueType SchemaValueType { get; set; }

            public bool IsNillable { get; set; } = false;

            public bool XmlText { get; set; }

            public bool OrderOblivious { get; set; } = false;

            public bool IsArray { get; set; }

            public Dictionary<string, Restriction> Restrictions { get; set; } = new();
        }

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

        private const int MAX_MAX_OCCURS = 99999;

        private readonly IJsonSchemaAnalyzer _schemaAnalyzer;
        private readonly Dictionary<string, List<string>> _requiredProperties = new Dictionary<string, List<string>>();
        private ModelMetadata _modelMetadata;
        private JsonSchema _schema;
        private JsonSchemaXsdMetadata _schemaXsdMetadata;

        private string ModelName { get; set; }

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
        /// <param name="jsonSchema">The Json Schema to be converted</param>
        /// <returns>An flattened representation of the Json Schema in the form of <see cref="ModelMetadata"/></returns>
        public ModelMetadata Convert(string jsonSchema)
        {
            _modelMetadata = new ModelMetadata();
            _schema = JsonSchema.FromText(jsonSchema);

            _schemaXsdMetadata = _schemaAnalyzer.AnalyzeSchema(_schema);
            ModelName = _schemaXsdMetadata.MessageName;

            ProcessSchema(_schema);

            return _modelMetadata;
        }

        private void ProcessSchema(JsonSchema schema)
        {
            var rootPath = JsonPointer.Parse("#");
            var name = ConvertToCSharpCompatibleName(ModelName);
            var context = new SchemaContext() { Id = name, ParentId = string.Empty, Name = name, XPath = "/" };
            SetTargetNamespace(schema);

            var propertiesKeyword = schema.GetKeywordOrNull<PropertiesKeyword>();
            var requiredKeyword = schema.GetKeywordOrNull<RequiredKeyword>();
            if (propertiesKeyword != null)
            {
                AddElement(rootPath, schema, context);
            }

            if (requiredKeyword is not null)
            {
                CheckForRequiredPropertiesKeyword(schema, context);
            }

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
                // We only travese the actual schema and their referenced/used sub-schemas.
                // This means that there might be types defined in $def/definitions that is
                // not included in the generated model - which is fine since they are not in use.
                case SchemaKeyword:
                case IdKeyword:
                case TypeKeyword:
                case ConstKeyword:
                case XsdNamespacesKeyword:
                case XsdSchemaAttributesKeyword:
                case XsdUnhandledAttributesKeyword:
                case XsdUnhandledEnumAttributesKeyword:
                case XsdTypeKeyword:
                case XsdAttributeKeyword:
                case XsdAnyAttributeKeyword:
                case XsdTextKeyword:
                case InfoKeyword:
                case RequiredKeyword:
                case EnumKeyword:
                case DefinitionsKeyword:
                case DefsKeyword:
                case MinItemsKeyword:
                case MaxItemsKeyword:
                case CommentKeyword:
                case XsdRootElementKeyword:
                case DescriptionKeyword:
                case TitleKeyword:
                case XsdMinOccursKeyword:
                case XsdMaxOccursKeyword:
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

                case XsdStructureKeyword { Value: "all" }:
                    context.OrderOblivious = true;
                    break;

                default:
                    throw new MetamodelConvertException($"Keyword {keyword.Keyword()} not processed!. It's not supported in the current version of the JsonSchemaToMetamodelConverter.");
            }

            OnKeywordProcessed(new KeywordProcessedEventArgs() { Path = path, Keyword = keyword });
        }

        private void ProcessRefKeyword(JsonPointer path, RefKeyword keyword, SchemaContext context)
        {
            var refPath = JsonPointer.Parse(keyword.Reference.ToString());
            var refSchema = _schema.FollowReference(refPath);

            ProcessSubSchema(refPath, refSchema, context);
        }

        private void ProcessOneOfKeyword(JsonPointer path, OneOfKeyword keyword, SchemaContext context)
        {
            // A oneOf keyword with only one subschema which isn't null makes it required
            if (KeywordHasSingleNonNullSchema(keyword))
            {
                AddRequiredProperties(context.Id, new List<string>() { context.Name });
            }

            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.Schemas)
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ProcessSubSchema(subSchemaPath, subSchema, context);

                subSchemaIndex++;
            }
        }

        private static bool KeywordHasSingleNonNullSchema(OneOfKeyword keyword)
        {
            if (keyword.Schemas.Count > 1)
            {
                return false;
            }

            if (keyword.Schemas.First().TryGetKeyword<TypeKeyword>(out var typeKeyword) && typeKeyword.Type != SchemaValueType.Null)
            {
                return true;
            }
            else if (keyword.Schemas.First().HasKeyword<RefKeyword>())
            {
                return true;
            }
            else
            {
                return false;
            }
        }

        private void ProcessAnyOfKeyword(JsonPointer path, AnyOfKeyword keyword, SchemaContext context)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.Schemas)
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ProcessSubSchema(subSchemaPath, subSchema, context);

                subSchemaIndex++;
            }
        }

        private void ProcessAllOfKeyword(JsonPointer path, AllOfKeyword keyword, SchemaContext context)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in keyword.Schemas)
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
                var currentContext = new SchemaContext() { Id = CombineId(context.Id, name), Name = name, ParentId = context.Id, XPath = CombineXPath(context.XPath, context.Name), OrderOblivious = context.OrderOblivious };
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/{name}"));

                if (property.TryGetKeyword(out XsdTextKeyword xsdTextKeyword))
                {
                    currentContext.XmlText = xsdTextKeyword.Value;
                }

                ProcessSubSchema(subSchemaPath, property, currentContext);
            }
        }

        private void ProcessSubSchema(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            CheckForRequiredPropertiesKeyword(subSchema, context);

            if (IsSchemaExclusivePrimitiveType(subSchema))
            {
                ProcessPrimitiveType(path, subSchema, context);
            }
            else if (IsExclusiveArrayType(subSchema))
            {
                ProcessArrayType(path, subSchema, context);
            }
            else
            {
                ProcessNonPrimitiveType(path, subSchema, context);
            }

            OnSubSchemaProcessed(new SubSchemaProcessedEventArgs() { Path = path, SubSchema = subSchema });
        }

        private void ProcessPrimitiveType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            var typeKeyword = subSchema.GetKeywordOrNull<TypeKeyword>();

            if (typeKeyword == null)
            {
                return;
            }

            context.SchemaValueType = GetPrimitiveType(typeKeyword.Type);
            AddElement(path, subSchema, context);
        }

        private void ProcessArrayType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            context.IsArray = true;
            var itemsKeyword = subSchema.GetKeywordOrNull<ItemsKeyword>();
            var singleSchema = itemsKeyword.SingleSchema;
            context.SchemaValueType = SchemaValueType.Array;

            if (IsRefType(singleSchema))
            {
                ProcessRefType(singleSchema, context);
                return;
            }

            if (IsSchemaExclusivePrimitiveType(singleSchema))
            {
                AddElement(path, subSchema, context);
                return;
            }

            // If the array has a properties keyword, the type should be created with the node name.
            if (singleSchema!.Keywords.TryGetKeyword(out PropertiesKeyword propertiesKeyword) && propertiesKeyword.Properties.Any())
            {
                ProcessRegularType(path, subSchema, context);
            }


            foreach (var keyword in singleSchema.Keywords!)
            {
                var keywordPath = path.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));

                ProcessKeyword(keywordPath, keyword, context);
            }
        }

        private void ProcessNonPrimitiveType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            if (IsRefType(subSchema))
            {
                context.IsNillable = IsNillableType(path);
                ProcessRefType(subSchema, context);
            }
            else if (IsNillableType(path))
            {
                ProcessNillableType(path, subSchema, context);
            }
            else if (IsRestrictionType(path))
            {
                ProcessRestrictionType(path, subSchema, context);
            }
            else
            {
                ProcessRegularType(path, subSchema, context);

                foreach (var keyword in subSchema.Keywords.OrderByPriority())
                {
                    var keywordPath = path.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));

                    ProcessKeyword(keywordPath, keyword, context);
                }
            }
        }

        private void ProcessRefType(JsonSchema subSchema, SchemaContext context)
        {
            var refKeyword = subSchema.GetKeywordOrNull<RefKeyword>();
            var refPath = JsonPointer.Parse(refKeyword.Reference.ToString());
            var refSchema = _schema.FollowReference(refPath);

            ProcessSubSchema(refPath, refSchema, context);
        }

        private void ProcessRestrictionType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            var allOfKeyword = subSchema.GetKeywordOrNull<AllOfKeyword>();

            // If it's a single subschema with only a reference then follow it.
            if (allOfKeyword.Schemas.Count == 1 && allOfKeyword.Schemas.First().HasKeyword<RefKeyword>())
            {
                var refSchema = allOfKeyword.Schemas.First();
                ProcessRefType(refSchema, context);
            }
            else
            {
                var refKeyword = allOfKeyword.Schemas.FirstOrDefault(s => s.HasKeyword<RefKeyword>())?.GetKeywordOrNull<RefKeyword>();
                if (refKeyword is not null)
                {
                    PopulateRestrictions(allOfKeyword, context.Restrictions);
                    ProcessRefType(allOfKeyword.Schemas.FirstOrDefault(s => s.HasKeyword<RefKeyword>()), context);
                    return;
                }

                var typeKeyword = allOfKeyword.Schemas.FirstOrDefault(s => s.HasKeyword<TypeKeyword>()).GetKeywordOrNull<TypeKeyword>();
                context.SchemaValueType = typeKeyword.Type;

                var enumSchema = allOfKeyword.Schemas.FirstOrDefault(s => s.HasKeyword<EnumKeyword>());
                if (enumSchema != null)
                {
                    AddElement(path, enumSchema, context);
                }
                else
                {
                    AddElement(path, subSchema, context);
                }
            }
        }

        private void ProcessNillableType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            TypeKeyword typeKeyword = null;
            if (subSchema.TryGetKeyword(out typeKeyword) && typeKeyword.Type.HasFlag(SchemaValueType.Array))
            {
                ProcessArrayType(path, subSchema, context);
            }
            else if (subSchema.TryGetKeyword(out typeKeyword) && typeKeyword.Type.HasFlag(SchemaValueType.Null))
            {
                context.IsNillable = true;
                ProcessPrimitiveType(path, subSchema, context);
            }
            else
            {
                var oneOfKeyword = subSchema.GetKeywordOrNull<OneOfKeyword>();
                var schema = oneOfKeyword.Schemas.FirstOrDefault(s => !s.HasKeyword<TypeKeyword>());

                context.IsNillable = true;

                ProcessSubSchema(path, schema, context);
            }
        }

        private void ProcessRegularType(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            var id = CombineId(context.ParentId, context.Name);

            if (IdAlreadyAdded(id))
            {
                return;
            }

            var typeName = ConvertToCSharpCompatibleName(GetTypeNameFromRefPath(path));
            if (string.IsNullOrEmpty(typeName))
            {
                typeName = ConvertToCSharpCompatibleName(context.Name);
            }

            int minOccurs = GetMinOccurs(subSchema, context);
            int maxOccurs = GetMaxOccurs(subSchema, context);
            string xPath = CombineXPath(context.XPath, context.Name);
            string name = ConvertToCSharpCompatibleName(context.Name);
            EnrichRestrictions(MapToXsdValueType(context.SchemaValueType, subSchema), subSchema, context.Restrictions);
            _modelMetadata.Elements.Add(
                id,
                new ElementMetadata()
                {
                    ID = id,
                    Name = name,
                    XName = context.Name,
                    TypeName = typeName,
                    ParentElement = string.IsNullOrEmpty(context.ParentId) ? null : context.ParentId,
                    XPath = xPath,
                    JsonSchemaPointer = path.ToString(JsonPointerStyle.Plain),
                    MinOccurs = minOccurs,
                    MaxOccurs = maxOccurs,
                    Type = ElementType.Group,
                    Restrictions = context.Restrictions,
                    DataBindingName = GetDataBindingName(ElementType.Group, maxOccurs, id, null, xPath),
                    DisplayString = GetDisplayString(id, typeName, minOccurs, maxOccurs),
                    IsTagContent = context.XmlText,
                    Nillable = context.IsNillable,
                    OrderOblivious = context.OrderOblivious
                });
        }

        private void AddElement(JsonPointer path, JsonSchema subSchema, SchemaContext context)
        {
            var id = CombineId(context.ParentId, context.Name);

            if (IdAlreadyAdded(id))
            {
                return;
            }

            var name = ConvertToCSharpCompatibleName(context.Name);
            var @type = GetType(subSchema);

            string typeName;
            if (@type == ElementType.Field)
            {
                typeName = ConvertToCSharpCompatibleName(GetTypeNameFromRefPath(path));
                if (string.IsNullOrEmpty(typeName))
                {
                    typeName = ConvertToCSharpCompatibleName(context.Name);
                }
            }
            else
            {
                typeName = context.SchemaValueType.ToString();
            }

            int minOccurs = GetMinOccurs(subSchema, context);
            int maxOccurs = GetMaxOccurs(subSchema, context);
            var fixedValue = GetFixedValue(subSchema);
            var xPath = CombineXPath(context.XPath, context.Name);
            var xsdValueType = MapToXsdValueType(context.SchemaValueType, subSchema);
            EnrichRestrictions(xsdValueType, subSchema, context.Restrictions);
            _modelMetadata.Elements.Add(
                context.Id,
                new ElementMetadata()
                {
                    ID = id,
                    Name = name,
                    XName = context.Name,
                    TypeName = typeName,
                    ParentElement = string.IsNullOrEmpty(context.ParentId) ? null : context.ParentId,
                    XsdValueType = xsdValueType,
                    XPath = xPath,
                    JsonSchemaPointer = path.ToString(JsonPointerStyle.Plain),
                    MinOccurs = minOccurs,
                    MaxOccurs = maxOccurs,
                    Type = @type,
                    Restrictions = context.Restrictions,
                    FixedValue = fixedValue,
                    DataBindingName = GetDataBindingName(@type, maxOccurs, id, fixedValue, xPath),
                    DisplayString = GetDisplayString(id, context.SchemaValueType.ToString(), minOccurs, maxOccurs),
                    IsTagContent = context.XmlText,
                    Nillable = context.IsNillable,
                    OrderOblivious = context.OrderOblivious
                });
        }

        private static string CombineId(string parentId, string elementName)
        {
            var typeSafeElementName = ConvertToCSharpCompatibleName(elementName);
            return string.IsNullOrEmpty(parentId) ? typeSafeElementName : $"{parentId}.{typeSafeElementName}";
        }

        private bool IdAlreadyAdded(string id)
        {
            return _modelMetadata.Elements.FirstOrDefault(e => e.Key == id).Value != null;
        }

        private static string ConvertToCSharpCompatibleName(string name)
        {
            if (string.IsNullOrEmpty(name))
            {
                return null;
            }

            return name.Replace("-", string.Empty);
        }

        private static BaseValueType? MapToXsdValueType(SchemaValueType jsonValueType, JsonSchema subSchema)
        {
            return jsonValueType switch
            {
                SchemaValueType.String => MapStringValueTypes(subSchema),
                SchemaValueType.Boolean => BaseValueType.Boolean,
                SchemaValueType.Number => BaseValueType.Decimal,
                SchemaValueType.Integer => MapIntegerValueTypes(subSchema),
                SchemaValueType.Array => MapValueFromArray(subSchema),
                _ => null
            };
        }

        private static BaseValueType? MapValueFromArray(JsonSchema subSchema)
        {
            if (!subSchema.TryGetKeyword(out ItemsKeyword itemsKeyword))
            {
                return null;
            }

            var singleSchema = itemsKeyword.SingleSchema;
            if (!singleSchema.TryGetKeyword(out TypeKeyword typeKeyword))
            {
                return null;
            }

            var type = GetPrimitiveType(typeKeyword.Type);
            return type switch
            {
                SchemaValueType.Null => null,
                SchemaValueType.String => MapStringValueTypes(subSchema),
                SchemaValueType.Integer => MapIntegerValueTypes(subSchema),
                SchemaValueType.Boolean => BaseValueType.Boolean,
                SchemaValueType.Number => BaseValueType.Decimal,
                _ => null
            };
        }

        private static BaseValueType MapIntegerValueTypes(JsonSchema subSchema)
        {
            var baseValueType = BaseValueType.Integer;

            if (TryParseXsdTypeKeyword(subSchema, out var parsedBaseValueType))
            {
                baseValueType = parsedBaseValueType;
            }

            return baseValueType;
        }

        private static bool TryParseXsdTypeKeyword(JsonSchema subSchema, out BaseValueType baseValueType)
        {
            BaseValueType parsedBaseValueType = BaseValueType.String;
            bool parseSuccess = false;

            if (subSchema.TryGetKeyword(out XsdTypeKeyword xsdTypeKeyword) && !string.IsNullOrEmpty(xsdTypeKeyword.Value))
            {
                parseSuccess = Enum.TryParse(xsdTypeKeyword.Value, true, out parsedBaseValueType);
            }
            else if (subSchema.TryGetKeyword(out AllOfKeyword allOfKeyword))
            {
                xsdTypeKeyword = allOfKeyword.Schemas.FirstOrDefault(s => s.HasKeyword<TypeKeyword>())
                    ?.GetKeywordOrNull<XsdTypeKeyword>();
                if (xsdTypeKeyword is not null)
                {
                    parseSuccess = Enum.TryParse(xsdTypeKeyword.Value, true, out parsedBaseValueType);
                }
            }

            baseValueType = parsedBaseValueType;
            return parseSuccess;
        }

        private static BaseValueType MapStringValueTypes(JsonSchema subSchema)
        {
            BaseValueType baseValueType = BaseValueType.String;

            if (subSchema.TryGetKeyword(out FormatKeyword formatKeyword) && !string.IsNullOrEmpty(formatKeyword.Value.Key))
            {
                var format = formatKeyword.Value.Key;
                switch (format)
                {
                    case "date":
                        return BaseValueType.Date;

                    case "date-time":
                        return BaseValueType.DateTime;

                    case "duration":
                        return BaseValueType.Duration;

                    case "day":
                        return BaseValueType.GDay;

                    case "month":
                        return BaseValueType.GMonth;

                    case "month-day":
                        return BaseValueType.GMonthDay;

                    case "year":
                        return BaseValueType.GYear;

                    case "year-month":
                        return BaseValueType.GYearMonth;

                    case "time":
                        return BaseValueType.Time;

                    case "email":
                        return BaseValueType.String;

                    case "uri":
                        return BaseValueType.AnyURI;
                }
            }

            return baseValueType;
        }

        private static string CombineXPath(string baseXPath, string name)
        {
            return (baseXPath == "/") ? $"/{name}" : $"{baseXPath}/{name}";
        }

        private int GetMinOccurs(JsonSchema subSchema, SchemaContext context)
        {
            if (context.IsNillable)
            {
                return 0;
            }

            int minOccurs = IsRequired(context.Id, context.Name) ? 1 : 0;

            var minItemsKeyword = subSchema.GetKeywordOrNull<MinItemsKeyword>();
            if (minItemsKeyword?.Value > minOccurs)
            {
                minOccurs = (int)minItemsKeyword.Value;
            }

            return minOccurs;
        }

        private static int GetMaxOccurs(JsonSchema subSchema, SchemaContext context)
        {
            int maxOccurs = 1;
            if (context.SchemaValueType == SchemaValueType.Array || context.IsArray)
            {
                maxOccurs = MAX_MAX_OCCURS;
            }

            var maxitemsKeyword = subSchema.GetKeywordOrNull<MaxItemsKeyword>();
            return maxitemsKeyword == null ? maxOccurs : (int)maxitemsKeyword.Value;
        }

        private static string GetFixedValue(JsonSchema subSchema)
        {
            var constKeyword = subSchema.GetKeywordOrNull<ConstKeyword>();
            if (constKeyword != null)
            {
                return constKeyword.Value?.ToString() ?? string.Empty;
            }

            return null;
        }

        private static ElementType GetType(JsonSchema subSchema)
        {
            var xsdAttributeTypeKeyword = subSchema.GetKeywordOrNull<XsdAttributeKeyword>();
            if (xsdAttributeTypeKeyword?.Value == true)
            {
                return ElementType.Attribute;
            }

            return ElementType.Field;
        }

        private static string GetDisplayString(string id, string typeName, int minOccurs, int maxOccurs)
        {
            return $"{id} : [{minOccurs}..{maxOccurs}] {typeName}";
        }

        private static string GetDataBindingName(ElementType @type, int maxOccurs, string id, string fixedValue, string xPath)
        {
            if (@type != ElementType.Group && id.Contains(".") && string.IsNullOrEmpty(fixedValue))
            {
                return GetDataBindingName(id, xPath);
            }
            else if (@type == ElementType.Group && maxOccurs > 1)
            {
                return GetDataBindingName(id, xPath);
            }

            return null;
        }

        private static string GetDataBindingName(string id, string xPath)
        {
            var firstPropertyName = id[0..id.IndexOf(".")];
            string dataBindingNameWithoutFirstPropertyName = xPath.Replace("/" + firstPropertyName + "/", string.Empty);
            string dataBindingName = dataBindingNameWithoutFirstPropertyName.Replace("/", ".");

            return dataBindingName;
        }

        private bool IsNillableType(JsonPointer path)
        {
            return _schemaXsdMetadata.GetCompatibleTypes(path).Contains(CompatibleXsdType.Nillable);
        }

        private bool IsRestrictionType(JsonPointer path)
        {
            return _schemaXsdMetadata.GetCompatibleTypes(path).Contains(CompatibleXsdType.SimpleTypeRestriction);
        }

        private static string GetTypeNameFromRefPath(JsonPointer pointer)
        {
            if (pointer.Segments.Length != 2 || (pointer.Segments[0].Value != "$defs" && pointer.Segments[0].Value != "definitions"))
            {
                return string.Empty;
            }

            return pointer.Segments[1].Value;
        }

        private void CheckForRequiredPropertiesKeyword(JsonSchema subSchema, SchemaContext context)
        {
            var requiredKeyword = subSchema.GetKeywordOrNull<RequiredKeyword>();
            if (requiredKeyword == null)
            {
                return;
            }

            AddRequiredProperties(context.Id, requiredKeyword.Properties.ToList());
        }

        private bool RequiredPropertiesAlreadyAdded(string id)
        {
            return _requiredProperties.ContainsKey(id);
        }

        private void AddRequiredProperties(string id, List<string> requiredProperties)
        {
            if (RequiredPropertiesAlreadyAdded(id))
            {
                _requiredProperties[id].AddRange(requiredProperties);
            }
            else
            {
                _requiredProperties.Add(id, requiredProperties);
            }
        }

        private bool IsRequired(string id, string name)
        {
            string parentId;
            if (id.Contains("."))
            {
                parentId = id.Substring(0, id.LastIndexOf("."));
            }
            else
            {
                parentId = id;
            }

            if (_requiredProperties.ContainsKey(parentId))
            {
                return _requiredProperties[parentId].Contains(name);
            }

            return false;
        }

        private static bool IsRefType(JsonSchema subSchema)
        {
            var refkeyword = subSchema.GetKeywordOrNull<RefKeyword>();

            return refkeyword != null;
        }

        /// <summary>
        /// Gets the primitive type flag set, either exlusively ie. it's
        /// only one flag set or in combination with null ie. it's a
        /// primitive nullable type.
        /// </summary>
        private static SchemaValueType GetPrimitiveType(SchemaValueType type)
        {
            if (IsExclusivePrimitiveType(type))
            {
                return type;
            }

            if (IsNullablePrimitiveType(type, SchemaValueType.String))
            {
                return SchemaValueType.String;
            }

            if (IsNullablePrimitiveType(type, SchemaValueType.Boolean))
            {
                return SchemaValueType.Boolean;
            }

            if (IsNullablePrimitiveType(type, SchemaValueType.Integer))
            {
                return SchemaValueType.Integer;
            }

            if (IsNullablePrimitiveType(type, SchemaValueType.Number))
            {
                return SchemaValueType.Number;
            }

            return SchemaValueType.Null;
        }

        /// <summary>
        /// Checks if the actualType parameter is of the expectedType parameter combined with null.
        /// SchemaValueType is a bitwise Enum and can hold all possible combinations.
        /// this method checks if one of the primitive types only is combined with null, ie. it's a nullable primitive type.
        /// </summary>
        private static bool IsNullablePrimitiveType(SchemaValueType actualType, SchemaValueType expectedType)
        {
            if ((actualType | (expectedType | SchemaValueType.Null)) == (expectedType | SchemaValueType.Null))
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Uses the type keyword to check if this exclusively is a primitive type.
        /// Nullable primitive types will return false.
        /// </summary>
        private static bool IsSchemaExclusivePrimitiveType(JsonSchema subSchema)
        {
            var typeKeyword = subSchema.GetKeywordOrNull<TypeKeyword>();

            if (typeKeyword == null)
            {
                return false;
            }

            return IsExclusivePrimitiveType(typeKeyword.Type);
        }

        /// <summary>
        /// Check if this exclusively is a primitive type, ie. it's not
        /// combined with any other flags.
        /// </summary>
        private static bool IsExclusivePrimitiveType(SchemaValueType type)
        {
            switch (type)
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

        private static bool IsExclusiveArrayType(JsonSchema subSchema)
        {
            var typeKeyword = subSchema.GetKeywordOrNull<TypeKeyword>();

            if (typeKeyword == null)
            {
                return false;
            }

            return typeKeyword.Type == SchemaValueType.Array;
        }

        private void SetTargetNamespace(JsonSchema jsonSchema)
        {
            var attributesKeyword = jsonSchema.GetKeywordOrNull<XsdSchemaAttributesKeyword>();

            var targetNamespace =
                attributesKeyword?.Properties?.Where(x => x.Name == nameof(XmlSchema.TargetNamespace))
                    .Select(x => x.Value).FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(targetNamespace))
            {
                _modelMetadata.TargetNamespace = targetNamespace;
            }
        }
    }
}
