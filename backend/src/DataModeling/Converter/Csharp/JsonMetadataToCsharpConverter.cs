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

        /// <summary>
        /// Create Model from ServiceMetadata object
        /// </summary>
        /// <param name="serviceMetadata">ServiceMetadata object</param>
        /// <returns>The model code in C#</returns>
        public string CreateModelFromMetadata(ModelMetadata serviceMetadata)
        {
            Dictionary<string, string> classes = new Dictionary<string, string>();

            CreateModelFromMetadataRecursive(classes, serviceMetadata.Elements.Values.First(el => el.ParentElement == null), serviceMetadata, serviceMetadata.TargetNamespace);

            StringBuilder writer = new StringBuilder()
                .AppendLine("using System;")
                .AppendLine("using System.Collections.Generic;")
                .AppendLine("using System.ComponentModel.DataAnnotations;")
                .AppendLine("using System.Linq;")
                .AppendLine("using System.Text.Json.Serialization;")
                .AppendLine("using System.Threading.Tasks;")
                .AppendLine("using System.Xml.Serialization;")
                .AppendLine("using Microsoft.AspNetCore.Mvc.ModelBinding;")
                .AppendLine("using Newtonsoft.Json;")
                .AppendLine($"namespace {_generationSettings.ModelNamespace}")
                .AppendLine("{")
                .Append(string.Concat(classes.Values))
                .AppendLine("}");

            return writer.ToString();
        }

        /// <summary>
        /// Recursive handling of all class
        /// </summary>
        /// <param name="classes">The classes</param>
        /// <param name="parentElement">The parent Element</param>
        /// <param name="serviceMetadata">Model metadata</param>
        /// <param name="targetNamespace">Target namespace in xsd schema.</param>
        private void CreateModelFromMetadataRecursive(Dictionary<string, string> classes, ElementMetadata parentElement, ModelMetadata serviceMetadata, string targetNamespace = null)
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

            int elementOrder = 0;

            foreach (ElementMetadata element in serviceMetadata.Elements.Select(e => e.Value).Where(ele => ele.ParentElement == parentElement.ID))
            {
                bool required = element.MinOccurs > 0;

                if (element.Type == ElementType.Field)
                {
                    ParseFieldProperty(element, classBuilder, ref elementOrder, required);
                }
                else if (element.Type == ElementType.Group)
                {
                    ParseGroupProperty(element, classBuilder, referredTypes, ref elementOrder);
                }
                else if (element.Type == ElementType.Attribute)
                {
                    ParseAttributeProperty(element, classBuilder, required);
                }
            }

            classBuilder.AppendLine(Indent() + "}");

            if (!classes.ContainsKey(parentElement.TypeName))
            {
                classes.Add(parentElement.TypeName, classBuilder.ToString());
            }

            foreach (ElementMetadata refType in referredTypes)
            {
                CreateModelFromMetadataRecursive(classes, refType, serviceMetadata);
            }
        }

        private void ParseFieldProperty(ElementMetadata element, StringBuilder classBuilder, ref int elementOrder, bool required)
        {
            (string dataType, bool isValueType) = GetPropertyType(element.XsdValueType);

            WriteRestrictionAnnotations(classBuilder, element);
            if (element.IsTagContent)
            {
                classBuilder.AppendLine(Indent(2) + "[XmlText()]");
            }
            else
            {
                elementOrder += 1;
                classBuilder.AppendLine(Indent(2) + "[XmlElement(\"" + element.XName + "\", Order = " + elementOrder + ")]");

                // Temporary fix - as long as we use System.Text.Json for serialization and  Newtonsoft.Json for
                // deserialization, we need both JsonProperty and JsonPropertyName annotations.
                classBuilder.AppendLine(Indent(2) + "[JsonProperty(\"" + element.XName + "\")]");
                classBuilder.AppendLine(Indent(2) + "[JsonPropertyName(\"" + element.XName + "\")]");
            }

            if (element.MaxOccurs > 1)
            {
                classBuilder.AppendLine(Indent(2) + "public List<" + dataType + "> " + element.Name + " { get; set; }\n");
            }
            else
            {
                if (required && isValueType)
                {
                    classBuilder.AppendLine(Indent(2) + "[Required]");
                }

                bool shouldBeNullable = isValueType && !element.IsTagContent; // Can't use complex type for XmlText.
                classBuilder.AppendLine(Indent(2) + "public " + dataType + (shouldBeNullable ? "?" : string.Empty) + " " + element.Name + " { get; set; }\n");
            }
        }

        private void ParseGroupProperty(ElementMetadata element, StringBuilder classBuilder, List<ElementMetadata> referredTypes, ref int elementOrder)
        {
            WriteRestrictionAnnotations(classBuilder, element);
            elementOrder += 1;
            classBuilder.AppendLine(Indent(2) + "[XmlElement(\"" + element.XName + "\", Order = " + elementOrder + ")]");

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
                classBuilder.AppendLine(Indent(2) + "public List<" + dataType + "> " + element.Name + " { get; set; }\n");
            }
            else
            {
                classBuilder.AppendLine(Indent(2) + "public " + dataType + " " + element.Name + " { get; set; }\n");
            }

            if (!primitiveType)
            {
                referredTypes.Add(element);
            }
        }

        private void ParseAttributeProperty(ElementMetadata element, StringBuilder classBuilder, bool required)
        {
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
                    classBuilder.AppendLine(Indent(2) + "public " + dataType + " " + element.Name + " {get; set; } = \"" + element.FixedValue + "\";\n");
                }
                else
                {
                    classBuilder.AppendLine(Indent(2) + "public " + dataType + " " + element.Name + " {get; set;} = " + element.FixedValue + ";\n");
                }
            }
            else
            {
                if (required && isValueType)
                {
                    classBuilder.AppendLine(Indent(2) + "[Required]");
                }
                classBuilder.AppendLine(Indent(2) + "public " + dataType + " " + element.Name + " { get; set; }\n");
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

            SetRangeRestriction(classBuilder, element, errorMessage, "minInclusive", "maxInclusive", out hasRange);
            if (!hasRange)
            {
                SetRangeRestriction(classBuilder, element, errorMessage, "minimum", "maximum", out hasRange);
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

        private void SetRangeRestriction(StringBuilder classBuilder, ElementMetadata element, string errorMessage, string leftRestrictionName, string rightRestrictionName, out bool hasRange)
        {
            hasRange = false;
            bool hasMin = element.Restrictions.TryGetValue(leftRestrictionName, out var minRestriction);
            bool hasMax = element.Restrictions.TryGetValue(rightRestrictionName, out var maxRestriction);

            if ( hasMin && hasMax)
            {
                classBuilder.AppendLine(Indent(2) + "[Range(" + minRestriction.Value + ", " + maxRestriction.Value + errorMessage + ")]");
                hasRange = true;
            }
            else if (hasMin)
            {
                classBuilder.AppendLine(Indent(2) + "[Range(" + minRestriction.Value + ", " + RightRangeLimit(element.XsdValueType ?? BaseValueType.Double) + errorMessage + ")]");
                hasRange = true;
            }
            else if (hasMax)
            {
                classBuilder.AppendLine(Indent(2) + "[Range(" +  LeftRangeLimit(element.XsdValueType ?? BaseValueType.Double) + ", " + maxRestriction.Value + errorMessage + ")]");
                hasRange = true;
            }
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

        private string LeftRangeLimit(BaseValueType type) => type switch
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
        private string RightRangeLimit(BaseValueType? type) => type switch
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
    }
}
