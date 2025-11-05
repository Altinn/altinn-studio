using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Altinn.Studio.DataModeling.Converter.Interfaces;
using Altinn.Studio.DataModeling.Metamodel;
using static Altinn.Studio.DataModeling.Utils.RestrictionsHelper;

namespace Altinn.Studio.DataModeling.Converter.Csharp
{
    /// <summary>
    /// This class is responsible for building the metadata model from JSON
    /// </summary>
    public class JsonMetadataToCsharpConverter : IModelMetadataToCsharpConverter
    {
        private readonly CSharpGenerationSettings _generationSettings;
        public JsonMetadataToCsharpConverter(CSharpGenerationSettings generationSettings)
        {
            _generationSettings = generationSettings;
        }

        private string Indent(int level = 1) => new string(' ', level * _generationSettings.IndentSize);

        /// <inheritdoc />
        public string CreateModelFromMetadata(ModelMetadata serviceMetadata, bool separateNamespaces, bool useNullableReferenceTypes)
        {
            Dictionary<string, string> classes = new();

            var rootElementType = serviceMetadata.GetRootElement();
            string modelNamespace = _generationSettings.ModelNamespace +
                                    (separateNamespaces ? $".{rootElementType.TypeName}"
                                        : string.Empty);

            CreateModelFromMetadataRecursive(classes, rootElementType, serviceMetadata, serviceMetadata.TargetNamespace, useNullableReferenceTypes);

            StringBuilder writer = new StringBuilder();
            writer.AppendLine(useNullableReferenceTypes ? "#nullable enable" : "#nullable disable");
            writer.AppendLine("using System;")
                .AppendLine("using System.Collections.Generic;")
                .AppendLine("using System.ComponentModel.DataAnnotations;")
                .AppendLine("using System.Linq;")
                .AppendLine("using System.Text.Json.Serialization;")
                .AppendLine("using System.Xml.Serialization;")
                .AppendLine("using Microsoft.AspNetCore.Mvc.ModelBinding;")
                .AppendLine("using Newtonsoft.Json;")
                .AppendLine($"namespace {modelNamespace}")
                .AppendLine("{")
                .Append(string.Concat(classes.Values))
                .AppendLine("}");

            string cSharpClasses = writer.ToString();

            Compiler.CompileToAssembly(cSharpClasses);

            return cSharpClasses;
        }

        /// <summary>
        /// Recursive handling of all class
        /// </summary>
        /// <param name="classes">The classes</param>
        /// <param name="parentElement">The parent Element</param>
        /// <param name="serviceMetadata">Model metadata</param>
        /// <param name="targetNamespace">Target namespace in xsd schema.</param>
        /// <param name="useNullableReferenceTypes">Whether to add nullable? to reference types</param>
        private void CreateModelFromMetadataRecursive(Dictionary<string, string> classes, ElementMetadata parentElement, ModelMetadata serviceMetadata, string targetNamespace, bool useNullableReferenceTypes)
        {
            List<ElementMetadata> referredTypes = new List<ElementMetadata>();

            if (classes.ContainsKey(parentElement.TypeName))
            {
                return;
            }

            StringBuilder classBuilder = new StringBuilder();
            if (parentElement.ParentElement == null && string.IsNullOrWhiteSpace(targetNamespace))
            {
                classBuilder.AppendLine(Indent() + "[XmlRoot(ElementName=\"" + parentElement.Name + "\")]");
            }
            else if (parentElement.ParentElement == null && !string.IsNullOrWhiteSpace(targetNamespace))
            {
                classBuilder.AppendLine(
                    Indent() + $"[XmlRoot(ElementName=\"{parentElement.Name}\", Namespace=\"{targetNamespace}\")]");
            }
            else
            {
                classBuilder.AppendLine(string.Empty);
            }

            classBuilder.AppendLine(Indent() + "public class " + parentElement.TypeName);
            classBuilder.AppendLine(Indent() + "{");


            if (ShouldWriteAltinnRowId(parentElement, serviceMetadata.Elements.Values.ToList()))
            {
                WriteAltinnRowId(classBuilder);
            }

            int elementOrder = 0;

            foreach (ElementMetadata element in serviceMetadata.Elements.Select(e => e.Value).Where(ele => ele.ParentElement == parentElement.ID))
            {
                bool required = element.MinOccurs > 0;

                if (element.Type == ElementType.Field)
                {
                    ParseFieldProperty(element, classBuilder, ref elementOrder, required, useNullableReferenceTypes);
                }
                else if (element.Type == ElementType.Group)
                {
                    ParseGroupProperty(element, classBuilder, serviceMetadata, referredTypes, ref elementOrder, useNullableReferenceTypes);
                }
                else if (element.Type == ElementType.Attribute)
                {
                    ParseAttributeProperty(element, classBuilder, required, useNullableReferenceTypes);
                }
            }

            classBuilder.AppendLine(Indent() + "}");

            if (!classes.ContainsKey(parentElement.TypeName))
            {
                classes.Add(parentElement.TypeName, classBuilder.ToString());
            }

            foreach (ElementMetadata refType in referredTypes)
            {
                CreateModelFromMetadataRecursive(classes, refType, serviceMetadata, targetNamespace: null, useNullableReferenceTypes);
            }
        }

        private void ParseFieldProperty(ElementMetadata element, StringBuilder classBuilder, ref int elementOrder, bool required, bool useNullableReferenceTypes)
        {
            string nullableReference = useNullableReferenceTypes ? "?" : string.Empty;
            (string dataType, bool isValueType) = GetPropertyType(element.XsdValueType);

            WriteRestrictionAnnotations(classBuilder, element);

            // [XmlText] properties can't be nullable value types, so we need a hack so that they behave as if nullable works.
            if (_generationSettings.XmlTextValueNullableHack && element.IsTagContent && isValueType)
            {
                if (required)
                {
                    classBuilder.AppendLine(Indent(2) + "[Required]");
                }
                classBuilder.AppendLine(Indent(2) + "[XmlIgnore]");
                classBuilder.AppendLine(Indent(2) + "[JsonPropertyName(\"value\")]");
                classBuilder.AppendLine(Indent(2) + "[JsonProperty(PropertyName = \"value\")]");
                classBuilder.AppendLine($"{Indent(2)}public {dataType}? valueNullable {{ get; set; }}");
                classBuilder.AppendLine();

                classBuilder.AppendLine(Indent(2) + "[XmlText]");
                classBuilder.AppendLine(Indent(2) + "[System.Text.Json.Serialization.JsonIgnore]");
                classBuilder.AppendLine(Indent(2) + "[Newtonsoft.Json.JsonIgnore]");
                classBuilder.AppendLine(Indent(2) + "public " + dataType + " value");
                classBuilder.AppendLine(Indent(2) + "{");
                classBuilder.AppendLine(Indent(3) + "get => valueNullable ?? default;");
                classBuilder.AppendLine(Indent(3) + "set");
                classBuilder.AppendLine(Indent(3) + "{");
                classBuilder.AppendLine(Indent(4) + "this.valueNullable = value;");
                classBuilder.AppendLine(Indent(3) + "}");
                classBuilder.AppendLine(Indent(2) + "}");
                classBuilder.AppendLine();
            }
            else if (element.IsTagContent)
            {
                classBuilder.AppendLine(Indent(2) + "[XmlText()]");
                if (required && isValueType) // Why [Required] only on value types?
                {
                    classBuilder.AppendLine(Indent(2) + "[Required]");
                }
                classBuilder.AppendLine($"{Indent(2)}public {dataType}{nullableReference} value {{ get; set; }}");
                classBuilder.AppendLine();
            }
            else
            {
                elementOrder += 1;
                AddXmlElementAnnotation(element, classBuilder, elementOrder, !isValueType && (element.Nillable ?? false));

                // Temporary fix - as long as we use System.Text.Json for serialization and  Newtonsoft.Json for
                // deserialization, we need both JsonProperty and JsonPropertyName annotations.
                classBuilder.AppendLine(Indent(2) + "[JsonProperty(\"" + element.XName + "\")]");
                classBuilder.AppendLine(Indent(2) + "[JsonPropertyName(\"" + element.XName + "\")]");

                if (element.MaxOccurs > 1)
                {
                    classBuilder.AppendLine($"{Indent(2)}public List<{dataType}>{nullableReference} {element.Name} {{ get; set; }}\n");
                }
                else
                {
                    if (required && isValueType)
                    {
                        classBuilder.AppendLine(Indent(2) + "[Required]");
                    }


                    if (isValueType)
                    {
                        classBuilder.AppendLine($"{Indent(2)}public {dataType}? {element.Name} {{ get; set; }}\n");

                        if (element.Nillable.HasValue && !element.Nillable.Value && element.MinOccurs == 0)
                        {
                            WriteShouldSerializeMethod(classBuilder, element.Name);
                        }
                    }
                    else
                    {
                        classBuilder.AppendLine($"{Indent(2)}public {dataType}{nullableReference} {element.Name} {{ get; set; }}\n");
                    }
                }
            }
        }

        private void ParseGroupProperty(ElementMetadata element, StringBuilder classBuilder, ModelMetadata serviceMetadata, List<ElementMetadata> referredTypes, ref int elementOrder, bool useNullableReferenceTypes)
        {
            var nullableReference = useNullableReferenceTypes ? "?" : string.Empty;
            WriteRestrictionAnnotations(classBuilder, element);
            elementOrder += 1;
            AddXmlElementAnnotation(element, classBuilder, elementOrder, element.Nillable ?? false);

            // Temporary fix - as long as we use System.Text.Json for serialization and  Newtonsoft.Json for
            // deserialization, we need both JsonProperty and JsonPropertyName annotations.
            classBuilder.AppendLine(Indent(2) + "[JsonProperty(\"" + element.XName + "\")]");
            classBuilder.AppendLine(Indent(2) + "[JsonPropertyName(\"" + element.XName + "\")]");

            bool primitiveType = false;
            string dataType = element.TypeName;
            if (element.XsdValueType != null)
            {
                try
                {
                    (dataType, _) = GetPropertyType(element.XsdValueType);
                    primitiveType = true;
                }
                catch (NotImplementedException)
                {
                    // No primitive type detected, assuming referred type
                }
            }

            if (element.MaxOccurs > 1)
            {
                classBuilder.AppendLine($"{Indent(2)}public List<{dataType}>{nullableReference} {element.Name} {{ get; set; }}\n");
            }
            else
            {
                classBuilder.AppendLine($"{Indent(2)}public {dataType}{nullableReference} {element.Name} {{ get; set; }}\n");

                if (_generationSettings.AddShouldSerializeForTagContent)
                {
                    AddShouldSerializeForTagContent(element, classBuilder, serviceMetadata);
                }
            }

            if (!primitiveType)
            {
                referredTypes.Add(element);
            }
        }

        private void AddXmlElementAnnotation(ElementMetadata element, StringBuilder classBuilder, int elementOrder, bool addNillableAttribute = false)
        {
            string additionalAttributeParams = string.Empty;
            if (!element.OrderOblivious)
            {
                additionalAttributeParams += $", Order = {elementOrder}";
            }

            if (addNillableAttribute)
            {
                additionalAttributeParams += ", IsNullable = true";
            }


            classBuilder.AppendLine($"""{Indent(2)}[XmlElement("{element.XName}"{additionalAttributeParams})]""");
        }

        private void AddShouldSerializeForTagContent(ElementMetadata element, StringBuilder classBuilder, ModelMetadata modelMetadata)
        {
            var children = modelMetadata.Elements.Values.Where(metadata =>
                metadata.ParentElement == element.ID);
            if (children.Count(metadata => metadata.FixedValue != null) == 1 && children.Count(metadata => metadata.IsTagContent) == 1)
            {
                var taggedContentChild = children.Single(metadata => metadata.IsTagContent);
                var value = _generationSettings.XmlTextValueNullableHack && taggedContentChild.XsdValueType.HasValue &&
                            GetPropertyType(taggedContentChild.XsdValueType).IsValueType
                    ? "valueNullable is not null"
                    : "value is not null";

                classBuilder.AppendLine($"{Indent(2)}public bool ShouldSerialize{element.Name}() => {element.Name}?.{value};");
                classBuilder.AppendLine();
            }
        }

        private void ParseAttributeProperty(ElementMetadata element, StringBuilder classBuilder, bool required, bool useNullableReferenceTypes)
        {
            string nullableReference = useNullableReferenceTypes ? "?" : string.Empty;
            string dataType = "string";
            bool isValueType = false;
            if (element.XsdValueType != null)
            {
                (dataType, isValueType) = GetPropertyType(element.XsdValueType.Value);
            }

            WriteRestrictionAnnotations(classBuilder, element);
            classBuilder.AppendLine(Indent(2) + "[XmlAttribute(\"" + element.XName + "\")]");
            if (element.FixedValue != null)
            {
                // This value is fixed so model will ignore any values posted from use. Bind Never prevents MVC Binding
                classBuilder.AppendLine(Indent(2) + "[BindNever]");
                if (dataType.Equals("string"))
                {
                    classBuilder.AppendLine(
                        $"{Indent(2)}public {dataType} {element.Name} {{ get; set; }} = \"{element.FixedValue}\";\n");
                }
                else
                {
                    classBuilder.AppendLine(Indent(2) + "public " + dataType + " " + element.Name + " { get; set; } = " + element.FixedValue + ";\n");
                }
            }
            else
            {
                if (required && isValueType)
                {
                    classBuilder.AppendLine(Indent(2) + "[Required]");
                }
                classBuilder.AppendLine($"{Indent(2)}public {dataType}{nullableReference} {element.Name} {{ get; set; }}\n");
            }
        }

        private void WriteRestrictionAnnotations(StringBuilder classBuilder, ElementMetadata element)
        {
            string errorMessage = string.Empty;

            if (element.Texts.ContainsKey(TextCategoryType.Error.ToString()))
            {
                errorMessage = ", ErrorMessage = \"" + element.Texts[TextCategoryType.Error.ToString()] + "\"";
            }

            WriteRestrictions(classBuilder, element, errorMessage, out bool hasRange);

            if (element.IsReadOnly)
            {
                classBuilder.AppendLine(Indent(2) + "[BindNever]");
            }

            if (!element.XsdValueType.HasValue || hasRange)
            {
                return;
            }

            WriteTypeRestrictions(classBuilder, element.XsdValueType.Value, errorMessage);
        }

        private void WriteRestrictions(StringBuilder classBuilder, ElementMetadata element, string errorMessage, out bool hasRange)
        {
            hasRange = false;
            if (element.Restrictions.Count == 0)
            {
                return;
            }

            if (element.Restrictions.TryGetValue("minLength", out var minLengthRestriction))
            {
                classBuilder.AppendLine(Indent(2) + "[MinLength(" + minLengthRestriction.Value + errorMessage + ")]");
            }

            if (element.Restrictions.TryGetValue("maxLength", out var maxLengthRestriction))
            {
                classBuilder.AppendLine(Indent(2) + "[MaxLength(" + maxLengthRestriction.Value + errorMessage + ")]");
            }

            WriteRangeRestriction(classBuilder, element, errorMessage, "minInclusive", "maxInclusive", out hasRange);
            if (!hasRange)
            {
                WriteRangeRestriction(classBuilder, element, errorMessage, "minimum", "maximum", out hasRange);
            }


            if (element.Restrictions.TryGetValue("pattern", out var patternRestriction))
            {
                classBuilder.AppendLine(Indent(2) + "[RegularExpression(@\"" + patternRestriction.Value + "\"" + errorMessage + ")]");
            }

            if (element.Restrictions.TryGetValue("totalDigits", out var totalDigitsRestriction))
            {
                uint totalDigitsValue = uint.Parse(totalDigitsRestriction.Value);
                string regexString = element.XsdValueType == BaseValueType.Decimal
                    ? TotalDigitsDecimalRegexString(totalDigitsValue)
                    : TotalDigitsIntegerRegexString(totalDigitsValue);
                classBuilder.AppendLine(
                    Indent(2) + $@"[RegularExpression(@""{regexString}""{errorMessage})]");
            }
        }

        private void WriteRangeRestriction(StringBuilder classBuilder, ElementMetadata element, string errorMessage, string leftRestrictionName, string rightRestrictionName, out bool hasRange)
        {
            hasRange = false;
            bool hasMinimum = element.Restrictions.TryGetValue(leftRestrictionName, out var minRestriction);
            bool hasMaximum = element.Restrictions.TryGetValue(rightRestrictionName, out var maxRestriction);

            if (hasMinimum && hasMaximum)
            {
                classBuilder.AppendLine($"{Indent(2)}[Range({GetRangeValueAsString(element, minRestriction)}, {GetRangeValueAsString(element, maxRestriction)}{errorMessage})]");
                hasRange = true;
            }
            else if (hasMinimum)
            {
                classBuilder.AppendLine($"{Indent(2)}[Range({GetRangeValueAsString(element, minRestriction)}, {RightRangeLimit(element.XsdValueType ?? BaseValueType.Double)}{errorMessage})]");
                hasRange = true;
            }
            else if (hasMaximum)
            {
                classBuilder.AppendLine($"{Indent(2)}[Range({LeftRangeLimit(element.XsdValueType ?? BaseValueType.Double)}, {GetRangeValueAsString(element, maxRestriction)}{errorMessage})]");
                hasRange = true;
            }
        }

        private static string GetRangeValueAsString(ElementMetadata element, Restriction restriction)
        {
            string value = restriction?.Value ?? string.Empty;
            bool isAlreadyDecimal = value.Contains('.') || value.Contains(',');
            // Use decimal range value for all types except int and long
            if (!isAlreadyDecimal && element.XsdValueType.HasValue && !new[]
                {
                    BaseValueType.Int, BaseValueType.Long
                }.Contains(element.XsdValueType.Value))
            {
                value = $"{value}d";
            }
            return value;
        }

        private void WriteTypeRestrictions(StringBuilder classBuilder, BaseValueType type, string errorMessage)
        {

            switch (type)
            {
                case BaseValueType.Double:
                case BaseValueType.Int:
                case BaseValueType.Integer:
                case BaseValueType.Long:
                case BaseValueType.NegativeInteger:
                case BaseValueType.NonPositiveInteger:
                case BaseValueType.NonNegativeInteger:
                case BaseValueType.PositiveInteger:
                    classBuilder.AppendLine(Indent(2) + $"[Range({LeftRangeLimit(type)},{RightRangeLimit(type)}" + errorMessage + ")]");
                    break;
                case BaseValueType.GYear:
                    classBuilder.AppendLine(Indent(2) + "[RegularExpression(@\"^[0-9]{4}$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.GYearMonth:
                    classBuilder.AppendLine(Indent(2) + "[RegularExpression(@\"^[0-9]{4}-(0[1-9]|1[0-2])$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.GMonth:
                    classBuilder.AppendLine(Indent(2) + "[RegularExpression(@\"^0[1-9]|1[0-2]$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.GDay:
                    classBuilder.AppendLine(Indent(2) + "[RegularExpression(@\"^0[1-9]|[1,2][0-9]|3[0,1]$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.Time:
                    classBuilder.AppendLine(Indent(2) + "[RegularExpression(@\"^([0,1][0-9]|[2][0-3]):[0-5][0-9]:[0-5][0-9](Z|(\\+|-)([0,1][0-9]|[2][0-3]):[0-5][0-9])?$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.TimePeriod:
                    classBuilder.AppendLine(Indent(2) + "[RegularExpression(@\"^-?P([0-9]*Y)?([0-9]*M)?([0-9]*D)?(T([0-9]*H)?([0-9]*M)?([0-9]*S)?)?$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.Date:
                    classBuilder.AppendLine(Indent(2) + "[RegularExpression(@\"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$\"" + errorMessage + ")]");
                    break;
            }
        }

        private static string LeftRangeLimit(BaseValueType type) => type switch
        {
            BaseValueType.Int => "Int32.MinValue",
            BaseValueType.Integer => "Double.MinValue",
            BaseValueType.NegativeInteger => "Double.MinValue",
            BaseValueType.NonPositiveInteger => "Double.MinValue",
            BaseValueType.NonNegativeInteger => "0",
            BaseValueType.PositiveInteger => "1",
            BaseValueType.Decimal => "Double.MinValue",
            BaseValueType.Double => "Double.MinValue",
            BaseValueType.Long => "Int64.MinValue",
            _ => throw new CsharpGenerationException("Unsupported range for type: " + type)
        };

        private static string RightRangeLimit(BaseValueType? type) => type switch
        {
            BaseValueType.Int => "Int32.MaxValue",
            BaseValueType.Integer => "Double.MaxValue",
            BaseValueType.NegativeInteger => "-1",
            BaseValueType.NonPositiveInteger => "0",
            BaseValueType.NonNegativeInteger => "Double.MaxValue",
            BaseValueType.PositiveInteger => "Double.MaxValue",
            BaseValueType.Decimal => "Double.MaxValue",
            BaseValueType.Double => "Double.MaxValue",
            BaseValueType.Long => "Int64.MaxValue",
            _ => throw new CsharpGenerationException("Unsupported range for type: " + type)
        };

        private static (string DataType, bool IsValueType) GetPropertyType(BaseValueType? typeName)
        {
            return typeName switch
            {
                BaseValueType.String
                    or BaseValueType.NormalizedString
                    or BaseValueType.Token
                    or BaseValueType.GDay
                    or BaseValueType.GYear
                    or BaseValueType.GYearMonth
                    or BaseValueType.GMonth
                    or BaseValueType.Time
                    or BaseValueType.TimePeriod
                    or BaseValueType.Date
                    or BaseValueType.AnyURI
                    or null => ("string", false),
                BaseValueType.Int => ("int", true),
                BaseValueType.Short => ("short", true),
                BaseValueType.Decimal => ("decimal", true),
                BaseValueType.Integer => ("decimal", true),
                BaseValueType.PositiveInteger => ("decimal", true),
                BaseValueType.NegativeInteger => ("decimal", true),
                BaseValueType.NonNegativeInteger => ("decimal", true),
                BaseValueType.NonPositiveInteger => ("decimal", true),
                BaseValueType.DateTime => ("DateTime", true),
                BaseValueType.Boolean => ("bool", true),
                BaseValueType.Double => ("double", true),
                BaseValueType.Long => ("long", true),
                _ => throw new CsharpGenerationException("Unsupported type: " + typeName)
            };
        }

        /// <summary>
        /// When nillable is set in xsd and minOccurs set to 0 nil attribute should not be set when serializing. Xml serializer by default sets attribute as true for nullable types.
        /// </summary>
        private void WriteShouldSerializeMethod(StringBuilder classBuilder, string propName)
        {
            classBuilder.AppendLine(Indent(2) + $"public bool ShouldSerialize{propName}() => {propName}.HasValue;");
            classBuilder.AppendLine();
        }

        private bool ShouldWriteAltinnRowId(ElementMetadata element, List<ElementMetadata> allElements) =>
            allElements.Any(e =>
                e.TypeName == element.TypeName && e.MaxOccurs > 1);

        private void WriteAltinnRowId(StringBuilder classBuilder)
        {
            classBuilder.AppendLine(Indent(2) + "[XmlAttribute(\"altinnRowId\")]");
            classBuilder.AppendLine(Indent(2) + "[JsonPropertyName(\"altinnRowId\")]");
            classBuilder.AppendLine(Indent(2) +
                                    "[System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]");
            classBuilder.AppendLine(Indent(2) + "[Newtonsoft.Json.JsonIgnore]");
            classBuilder.AppendLine(Indent(2) + "public Guid AltinnRowId { get; set; }");
            classBuilder.AppendLine("");
            classBuilder.AppendLine(Indent(2) + "public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;");
            classBuilder.AppendLine();
        }
    }
}
