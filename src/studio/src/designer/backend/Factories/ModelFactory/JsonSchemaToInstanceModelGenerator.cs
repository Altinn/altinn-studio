using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Altinn.Studio.Designer.Models;

using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;

namespace Altinn.Studio.Designer.Factories.ModelFactory
{
    /// <summary>
    ///     Utility class for converting JSON Schema to a Json Instance model
    /// </summary>
    public class JsonSchemaToInstanceModelGenerator
    {
        private const string XmlSchemaNamespace = "http://www.w3.org/2001/XMLSchema";
        private const int MagicNumberMaxOccurs = 99999;

        private readonly Dictionary<string, JsonSchema> definitions = new Dictionary<string, JsonSchema>();
        private readonly Dictionary<string, Dictionary<string, TextResourceElement>> modelTexts = new Dictionary<string, Dictionary<string, TextResourceElement>>();
        private JsonObject instanceModel = new JsonObject();
        private JsonObject elements = new JsonObject();
        private JsonSchema jsonSchema;
        private string multiplicityString;
        private string firstPropertyName;

        /// <summary>
        ///  Initializes a new instance of the <see cref="JsonSchemaToInstanceModelGenerator"/> class.
        ///  Creates an initial JSON Instance Model. Assumes top object has properties and that there are multiple definitions.
        ///  <see cref="GetInstanceModel"> to get the model </see>"/>
        /// </summary>
        /// <param name="organizationName">The organisation name</param>
        /// <param name="serviceName">Service name</param>
        /// <param name="jsonSchema">The Json Schema to generate the instance model from</param>
        /// <param name="multiplicityString">String to append for marking arrays</param>
        public JsonSchemaToInstanceModelGenerator(string organizationName, string serviceName, JsonSchema jsonSchema, string multiplicityString = "[*]")
        {
            this.jsonSchema = jsonSchema;
            this.multiplicityString = multiplicityString;

            instanceModel.Add("Org", organizationName);
            instanceModel.Add("ServiceName", serviceName);
            instanceModel.Add("Elements", elements);

            foreach (KeyValuePair<string, JsonSchema> def in jsonSchema.Definitions())
            {
                definitions.Add(def.Key, def.Value);
            }

            GenerateInitialReferences();
        }

        /// <summary>
        ///   Returns the current instance model of the Schema.
        /// </summary>
        /// <returns>A Json Object which represents the instance model of the schema</returns>
        ///
        public JsonObject GetInstanceModel()
        {
            return instanceModel;
        }

        /// <summary>
        ///  Returns the current service metamodel.
        /// </summary>
        /// <returns>The Service Metadata object which represent the instance model of the Schema</returns>
        public ModelMetadata GetModelMetadata()
        {
            return Newtonsoft.Json.JsonConvert.DeserializeObject<ModelMetadata>(instanceModel.ToString());
        }

        /// <summary>
        ///  Returns the texts found when parsing the Schema
        /// </summary>
        /// <returns></returns>
        public Dictionary<string, Dictionary<string, TextResourceElement>> GetTexts()
        {
            return modelTexts;
        }

        private JsonObject GenerateInitialReferences()
        {
            string title = jsonSchema.Title();

            if (jsonSchema.Properties() == null)
            {
                throw new ApplicationException("Cannot read top level object. Did not find any properties");
            }

            // Handle all properties
            foreach (KeyValuePair<string, JsonSchema> def in jsonSchema.Properties())
            {
                if (string.IsNullOrEmpty(firstPropertyName))
                {
                    firstPropertyName = def.Key;
                }

                TraverseModel(string.Empty, title, def.Key, def.Value, IsRequired(def.Key, jsonSchema), new HashSet<string>(), jsonSchema, string.Empty);
            }

            return instanceModel;
        }

        /// <summary>
        ///  Expands an element with a given path if there are no other subtrees below the path and the path has an expandable type.
        /// </summary>
        /// <param name="path">the path to expand</param>
        /// <returns>instance modell with new expanded elements</returns>
        public JsonObject ExpandPath(string path)
        {
            JsonObject startPoint = instanceModel.TryGetObject("Elements").TryGetObject(path);
            if (startPoint == null)
            {
                throw new ApplicationException("Path does not exist in instance model");
            }

            string typeName = startPoint.TryGetString("TypeName");
            string type = startPoint.TryGetString("Type");

            if (typeName == null)
            {
                throw new ApplicationException("Path cannot be expanded");
            }

            JsonSchema jsonSchema = definitions.GetValueOrDefault(typeName);
            if (jsonSchema == null || !string.Equals("Group", type))
            {
                throw new ApplicationException("Path cannot be expanded since type is not a group: " + typeName);
            }

            // Only handle properties below path
            try
            {
                foreach (KeyValuePair<string, JsonSchema> def in jsonSchema.Properties())
                {
                    TraverseModel(path, typeName, def.Key, def.Value, false, new HashSet<string>(), jsonSchema, string.Empty);
                }
            }
            catch (Exception e)
            {
                throw new ApplicationException("Path already expanded or failure in expanding code", e);
            }

            return instanceModel;
        }

        /// <summary>
        ///  Removes all elements (subtree) of an existing element  the instance model, but not the element itself.
        /// </summary>
        /// <param name="path">the path that should no longer have any children</param>
        /// <returns>the instance model without the subtree</returns>
        public JsonObject RemovePath(string path)
        {
            JsonObject startPoint = instanceModel.TryGetObject("Elements").TryGetObject(path);
            if (startPoint == null)
            {
                throw new ApplicationException("Path does not exist in instance model");
            }

            List<string> pathsToRemove = new List<string>();
            foreach (string pathName in elements.Keys)
            {
                if (pathName.StartsWith(path) && pathName.Length > path.Length)
                {
                    pathsToRemove.Add(pathName);
                }
            }

            if (pathsToRemove.Count == 0)
            {
                throw new ApplicationException("Nothing to remove, no subelements found");
            }

            foreach (string pathName in pathsToRemove)
            {
                elements.Remove(pathName);
            }

            return instanceModel;
        }

        private bool IsRequired(string propertyName, JsonSchema parentType)
        {
            List<string> requiredProperties = parentType.Required();

            if (requiredProperties != null && requiredProperties.Contains(propertyName))
            {
                return true;
            }

            return false;
        }

        private string SanitizeName(string name)
        {
            if (string.IsNullOrEmpty(name))
            {
                return null;
            }

            return XsdToJsonSchema.SanitizeName(name);
        }

        private void TraverseModel(string parentPath, string parentTypeName, string propertyName, JsonSchema currentJsonSchema, bool isRequired, ISet<string> alreadyVisitedTypes, JsonSchema parentJsonSchema, string parentXpath)
        {
            string sanitizedPropertyName = SanitizeName(propertyName);
            string xPath;
            string path;
            int index = 0;
            do
            {
                path = (string.IsNullOrEmpty(parentPath) ? string.Empty : parentPath + ".") + sanitizedPropertyName;
                xPath = (string.IsNullOrEmpty(parentXpath) ? "/" : parentXpath + "/") + propertyName;
                if (++index >= 2)
                {
                    path += index.ToString();
                    xPath += index.ToString();
                }
            }
            while (elements.ContainsKey(path));

            // exclude elements that does not start with firstPropertyName
            if (!path.StartsWith(firstPropertyName))
            {
                return;
            }

            string minItems = "0";
            string maxItems = "1";

            TypeKeyword currentJsonSchemaType = currentJsonSchema.Get<TypeKeyword>();

            if (currentJsonSchemaType != null && currentJsonSchemaType.Value == JsonSchemaType.Array)
            {
                List<JsonSchema> items = currentJsonSchema.Items();
                path += multiplicityString;
                FollowRef(path, items[0], alreadyVisitedTypes, xPath); // TODO fix multiple item types. It now uses only the first

                double? minItemsValue = currentJsonSchema.MinItems();
                double? maxItemsValue = currentJsonSchema.MaxItems();

                if (minItemsValue.HasValue)
                {
                    minItems = minItemsValue.ToString();
                }

                maxItems = "*";
                if (maxItemsValue.HasValue && maxItemsValue.Value != MagicNumberMaxOccurs)
                {
                    maxItems = maxItemsValue.ToString();
                }
            }
            else if (currentJsonSchemaType != null && currentJsonSchemaType.Value == JsonSchemaType.Object)
            {   
                if (alreadyVisitedTypes.Contains(sanitizedPropertyName))
                {
                    return;
                }

                ISet<string> currentlyVisitedTypes = new HashSet<string>(alreadyVisitedTypes);
                currentlyVisitedTypes.Add(sanitizedPropertyName);
                if (currentJsonSchema.Properties() != null)
                {
                    foreach (KeyValuePair<string, JsonSchema> def in currentJsonSchema.Properties())
                    {
                        TraverseModel(path, sanitizedPropertyName, def.Key, def.Value, IsRequired(def.Key, currentJsonSchema), currentlyVisitedTypes, currentJsonSchema, xPath);
                    }
                }                
            }
            else
            {
                FollowRef(path, currentJsonSchema, alreadyVisitedTypes, xPath);
                if (isRequired)
                {
                    minItems = "1";
                }
            }

            JsonObject result = new JsonObject();

            string inputType = "Field";
            string xsdType = currentJsonSchema.OtherData.TryGetString("@xsdType");

            result.Add("ID", RemoveStarsFromPath(path));

            string parentElement = ExtractParent(path);
            if (parentElement != null)
            {
                result.Add("ParentElement", RemoveStarsFromPath(parentElement));
            }

            string xsdValueType = FollowValueType(currentJsonSchema);

            string typeName = ExtractTypeNameFromSchema(currentJsonSchema);
            if (typeName != null)
            {
                result.Add("TypeName", SanitizeName(typeName));
            }
            else
            {
                result.Add("TypeName", sanitizedPropertyName);
            }

            result.Add("Name", sanitizedPropertyName);

            string fixedValue = null;
            JsonValue fixedValueJson = currentJsonSchema.Const();
            if (fixedValueJson != null)
            {
                fixedValue = fixedValueJson.String;
            }

            if (xsdType != null && xsdType.Equals("XmlAttribute"))
            {
                inputType = "Attribute";
            }
            else if ((currentJsonSchemaType == null && xsdValueType == null) || (currentJsonSchemaType != null && (currentJsonSchemaType.Value == JsonSchemaType.Object || currentJsonSchemaType.Value == JsonSchemaType.Array)))
            {
                inputType = "Group";
            }

            int maxOccursParsed = maxItems.Equals("*") ? MagicNumberMaxOccurs : int.Parse(maxItems);

            if ((!inputType.Equals("Group") && string.IsNullOrEmpty(fixedValue)) || (inputType.Equals("Group") && maxOccursParsed > 1))
            {
                string dataBindingNameWithoutFirstPropertyName = $"{parentXpath}/{propertyName}".Replace("/" + firstPropertyName + "/", string.Empty);
                string dataBindingName = dataBindingNameWithoutFirstPropertyName.Replace("/", ".");
                result.Add("DataBindingName", dataBindingName);
            }

            result.Add("XPath", xPath);

            result.Add("Restrictions", ExtractRestrictions(xsdValueType, currentJsonSchema));

            result.Add("Type", inputType);

            if (!string.IsNullOrEmpty(xsdValueType))
            {
                result.Add("XsdValueType", char.ToUpper(xsdValueType[0]) + xsdValueType.Substring(1)); // Uppercase first character
            }

            if (path.EndsWith(".value"))
            {
                result.Add("Texts", ExtractTexts(parentElement.Split(".").Last(), parentJsonSchema));
                result.Add("IsTagContent", true);
            }
            else
            {
                result.Add("Texts", ExtractTexts(propertyName, currentJsonSchema));
            }

            result.Add("CustomProperties", new JsonObject()); // ??

            result.Add("MaxOccurs", maxOccursParsed);
            result.Add("MinOccurs", int.Parse(minItems));

            result.Add("XName", propertyName);

            if (fixedValue != null)
            {
                result.Add("FixedValue", fixedValue);
            }

            string jsonSchemaPointer = "#/properties/" + propertyName;
            if (parentElement != null)
            {
                jsonSchemaPointer = "#/definitions/" + parentTypeName + "/properties/" + propertyName;
            }

            result.Add("JsonSchemaPointer", jsonSchemaPointer);

            string cardinality = "[" + minItems + ".." + maxItems + "]";
            string displayString = RemoveLastStar(path) + " : " + cardinality + " " + SanitizeName(typeName);
            result.Add("DisplayString", displayString);

            // TODO ..., XmlSchemaReference
            elements.Add(RemoveStarsFromPath(path), result);
        }

        // remove [*] in path
        private static string RemoveStarsFromPath(string path)
        {
            return path.Replace("[*]", string.Empty);
        }

        private JsonValue ExtractTexts(string propertyName, JsonSchema propertyType)
        {
            JsonObject result = new JsonObject();

            JsonValue otherData = propertyType.OtherData;
            if (otherData == null)
            {
                return result;
            }

            JsonValue texts = otherData.Object.GetValueOrDefault("texts");

            if (texts == null)
            {
                // For some unknown reason Manatee sometimes needs to explicit use this method to extract other data texts
                TextsKeyword texts2 = propertyType.Get<TextsKeyword>();
                if (texts2 != null)
                {
                    texts = texts2.ToJson(new JsonSerializer());
                }
            }

            if (texts != null)
            {
                foreach (string textType in texts.Object.Keys)
                {
                    JsonValue language = texts.Object.GetValueOrDefault(textType);

                    string textKey = TextTypeFormat(propertyName, textType);

                    result.Add(TextTypeFormat(textType), textKey);

                    Dictionary<string, TextResourceElement> languageWithTextResource = new Dictionary<string, TextResourceElement>();

                    foreach (string lang in language.Object.Keys)
                    {
                        string textMessage = language.Object.TryGetString(lang);
                        languageWithTextResource.Add(LanguageCode(lang), new TextResourceElement { Id = textKey, Value = textMessage });
                    }

                    if (!modelTexts.ContainsKey(textKey))
                    {
                        modelTexts.Add(textKey, languageWithTextResource);
                    }
                }
            }

            return result;
        }

        private string TextTypeFormat(string propertyName, string textType)
        {
            string number = string.Concat(propertyName.ToArray().Reverse().TakeWhile(char.IsNumber).Reverse());
            if (!string.IsNullOrEmpty(number))
            {
                number += ".";
            }

            string textKey = number + propertyName.Replace("-", string.Empty) + "." + TextTypeFormat(textType);
            return textKey;
        }

        private static string LanguageCode(string lang)
        {
            string langLocale = lang;
            switch (lang)
            {
                case "NOB":
                    langLocale = "nb";
                    break;
                case "NNO":
                case "NON":
                    langLocale = "nn";
                    break;
                case "SME":
                    langLocale = "se";
                    break;
                case "EN":
                    langLocale = "en";
                    break;
            }

            return langLocale;
        }

        private string TextTypeFormat(string textType)
        {
            switch (textType)
            {
                case "DEF":
                    return "Def";

                case "LEDE":
                    return "Label";

                case "HINT":
                    return "PlaceHolder";

                case "HJELP":
                    return "Help";
            }

            return textType;
        }

        private string ExtractTypeNameFromSchema(JsonSchema jSchema)
        {
            string reference = jSchema.Ref();
            if (reference != null)
            {
                return ExtractTypeNameFromDefinitionReference(reference);
            }

            TypeKeyword type = jSchema.Get<TypeKeyword>();

            if (type != null)
            {
                if (type.Value == JsonSchemaType.Array)
                {
                    List<JsonSchema> items = jSchema.Items();

                    return ExtractTypeNameFromSchema(items[0]);
                }

                if (type.Value == JsonSchemaType.Object)
                {
                    return jSchema.Title();
                }

                return type.Value.ToString();
            }

            return null;
        }

        private string ExtractParent(string path)
        {
            if (path == null)
            {
                return null;
            }

            int lastPointIndex = path.LastIndexOf('.');

            if (lastPointIndex > 0)
            {
                return path.Substring(0, lastPointIndex);
            }

            return null;
        }

        private JsonObject ExtractRestrictions(string typeName, JsonSchema jSchema)
        {
            var restriction = new JsonObject();

            if (typeName == null)
            {
                return restriction;
            }

            string reference;
            do
            {
                reference = jSchema.Ref();
                if (reference != null)
                {
                    jSchema = definitions.GetValueOrDefault(ExtractTypeNameFromDefinitionReference(reference));
                }
            }
            while (reference != null);

            switch (typeName)
            {
                case "string":
                    {
                        double? minLength = jSchema.MinLength();
                        double? maxLength = jSchema.MaxLength();
                        if (minLength != null && minLength == maxLength)
                        {
                            AddRestrictionValue(restriction, "length", minLength);
                        }
                        else
                        {
                            AddRestrictionValue(restriction, "minLength", minLength);
                            AddRestrictionValue(restriction, "maxLength", maxLength);
                        }

                        Regex pattern = jSchema.Pattern();
                        if (pattern != null)
                        {
                            var pat = new JsonObject();
                            pat.Add("Value", pattern.ToString());

                            restriction.Add("pattern", pat);
                        }

                        // enum restriction?
                        List<JsonValue> enumerations = jSchema.Enum();
                        if (enumerations != null && enumerations.Count > 0)
                        {
                            string value = string.Empty;
                            foreach (JsonValue enumeration in enumerations)
                            {
                                if (value.Length > 0)
                                {
                                    value += ";";
                                }

                                value += enumeration.String;
                            }

                            JsonObject enumerationObject = new JsonObject();
                            enumerationObject.Add("Value", value);

                            restriction.Add("enumeration", enumerationObject);
                        }

                        break;
                    }

                case "integer":
                case "decimal":
                case "positiveInteger":
                case "number":
                    {
                        int totalDigits = 0;
                        if (jSchema.Maximum() != null && jSchema.Minimum() == -jSchema.Maximum())
                        {
                            string maxAsString = jSchema.Maximum().ToString();
                            if (maxAsString.Length > 0 && maxAsString.Replace("9", string.Empty).Length == 0)
                            {
                                totalDigits = maxAsString.Length;
                            }
                        }

                        if (totalDigits != 0)
                        {
                            AddRestrictionValue(restriction, "totalDigits", totalDigits);
                        }
                        else
                        {
                            AddRestrictionValue(restriction, "minimum", jSchema.Minimum());
                            AddRestrictionValue(restriction, "maximum", jSchema.Maximum());
                        }

                        AddRestrictionValue(restriction, "exclusiveMinimum", jSchema.ExclusiveMinimum());
                        AddRestrictionValue(restriction, "exclusiveMaximum", jSchema.ExclusiveMaximum());

                        break;
                    }

                default:
                    {
                        break;
                    }
            }

            return restriction;
        }

        private static void AddRestrictionValue(JsonObject restriction, string name, double? value)
        {
            if (value.HasValue)
            {
                JsonObject len = new JsonObject();
                len.Add("Value", value.ToString());

                restriction.Add(name, len);
            }
        }

        private string RemoveLastStar(string path)
        {
            if (multiplicityString.Length > 0 && path.EndsWith(multiplicityString))
            {
                return path.Substring(0, path.Length - 3);
            }

            return path;
        }

        private void FollowRef(string path, JsonSchema jSchema, ISet<string> alreadyVisitedTypes, string parentXpath)
        {
            string reference = jSchema.Ref();
            if (reference != null)
            {
                string typeName = ExtractTypeNameFromDefinitionReference(reference);
                JsonSchema schema = definitions.GetValueOrDefault(typeName);
                if (schema != null)
                {
                    if (alreadyVisitedTypes.Contains(typeName))
                    {
                        return;
                    }

                    ISet<string> currentlyVisitedTypes = new HashSet<string>(alreadyVisitedTypes);
                    currentlyVisitedTypes.Add(typeName);

                    if (schema.Properties() != null)
                    {
                        foreach (KeyValuePair<string, JsonSchema> def in schema.Properties())
                        {
                            TraverseModel(path, typeName, def.Key, def.Value, IsRequired(def.Key, schema), currentlyVisitedTypes, jSchema, parentXpath);
                        }
                    }
                    else if (schema.OneOf() != null)
                    {
                        foreach (JsonSchema oneOfSchema in schema.OneOf())
                        {
                            if (oneOfSchema.Ref() != null)
                            {
                                FollowRef(path, oneOfSchema, currentlyVisitedTypes, parentXpath);
                            }
                            else if (oneOfSchema.Properties() != null)
                            {
                                foreach (KeyValuePair<string, JsonSchema> def in oneOfSchema.Properties())
                                {
                                    TraverseModel(path, typeName, def.Key, def.Value, IsRequired(def.Key, oneOfSchema), currentlyVisitedTypes, jSchema, parentXpath);
                                }
                            }
                        }
                    }
                    else if (schema.AllOf() != null)
                    {
                        foreach (JsonSchema allOfSchema in schema.AllOf())
                        {
                            if (allOfSchema.Ref() != null)
                            {
                                FollowRef(path, allOfSchema, currentlyVisitedTypes, parentXpath);
                            }
                            else if (allOfSchema.Properties() != null)
                            {
                                foreach (KeyValuePair<string, JsonSchema> def in allOfSchema.Properties())
                                {
                                    TraverseModel(path, typeName, def.Key, def.Value, IsRequired(def.Key, allOfSchema), currentlyVisitedTypes, jSchema, parentXpath);
                                }
                            }
                        }
                    }
                }
            }
        }

        private string FollowValueType(JsonSchema jSchema)
        {
            TypeKeyword topType = jSchema.Get<TypeKeyword>();
            if (topType != null)
            {
                return HandleJsonTypes(jSchema);
            }

            string reference = jSchema.Ref();
            if (reference != null)
            {
                JsonSchema nextSchema = definitions.GetValueOrDefault(ExtractTypeNameFromDefinitionReference(reference));
                if (nextSchema != null)
                {
                    TypeKeyword type = nextSchema.Get<TypeKeyword>();

                    if (type != null)
                    {
                       return HandleJsonTypes(nextSchema);
                    }
                    else
                    {
                        return FollowValueType(nextSchema);
                    }
                }
            }

            return null;
        }

        private string HandleJsonTypes(JsonSchema jSchema)
        {
            TypeKeyword type = jSchema.Get<TypeKeyword>();

            if (type != null)
            {
                switch (type.Value)
                {
                    case JsonSchemaType.String:
                        {
                            FormatKeyword format = jSchema.Get<FormatKeyword>();
                            if (format != null && format.Value != null && !string.IsNullOrEmpty(format.Value))
                            {
                                return HandleFormatTypes(format.Value);
                            }

                            return "string";
                        }

                    case JsonSchemaType.Boolean:
                        return "boolean";
                    case JsonSchemaType.Number:
                        return "decimal";
                    case JsonSchemaType.Integer:
                        {
                            double? minimum = jSchema.Minimum();
                            if (minimum > 0.0)
                            {
                                return "positiveInteger";
                            }
                            else if (minimum == 0.0)
                            {
                                return "nonNegativeInteger";
                            }
                            else
                            {
                                return "integer";
                            }
                        }
                }
            }

            return null;
        }

        private string HandleFormatTypes(string format)
        {
            switch (format)
            {
                case "date":
                    return "date";

                case "date-time":
                    return "dateTime";

                case "duration":
                    return "duration";

                case "day":
                    return "gDay";

                case "month":
                    return "gMonth";

                case "month-day":
                    return "gMonthDay";

                case "year":
                    return "gYear";

                case "year-month":
                    return "gYearMonth";

                case "time":
                    return "time";

                case "email":
                    return "string";

                case "uri":
                    return "anyUri";
            }

            return "unknown";
        }

        private string ExtractTypeNameFromDefinitionReference(string reference)
        {
            if (reference != null)
            {
                return reference.Replace("#/definitions/", string.Empty);
            }

            return "Unknown";
        }
    }
}
