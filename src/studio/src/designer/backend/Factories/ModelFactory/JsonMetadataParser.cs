using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.ModelMetadatalModels;

namespace Altinn.Studio.Designer.Factories.ModelFactory
{
    /// <summary>
    /// This class is responsible for building the metadata model from JSON
    /// </summary>
    public class JsonMetadataParser
    {
        private ModelMetadata _serviceMetadata;

        /// <summary>
        /// Create Model from ServiceMetadata object
        /// </summary>
        /// <param name="serviceMetadata">ServiceMetadata object</param>
        /// <returns>The model code in C#</returns>
        public string CreateModelFromMetadata(ModelMetadata serviceMetadata)
        {
            _serviceMetadata = serviceMetadata;

            Dictionary<string, string> classes = new Dictionary<string, string>();

            CreateModelFromMetadataRecursive(classes, serviceMetadata.Elements.Values.First(el => el.ParentElement == null));

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
                .AppendLine("namespace " + string.Format(CodeGeneration.AppNamespaceTemplate + ".Models"))
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
        private void CreateModelFromMetadataRecursive(Dictionary<string, string> classes, ElementMetadata parentElement)
        {
            List<ElementMetadata> referredTypes = new List<ElementMetadata>();

            if (classes.ContainsKey(parentElement.TypeName))
            {
                return;
            }

            StringBuilder classBuilder = new StringBuilder();
            if (parentElement.ParentElement == null)
            {
                classBuilder.AppendLine("  [XmlRoot(ElementName=\"" + parentElement.Name + "\")]");
            }
            else
            {
                classBuilder.AppendLine(string.Empty);
            }

            classBuilder.AppendLine("  public class " + parentElement.TypeName);
            classBuilder.AppendLine("  {");

            foreach (KeyValuePair<string, ElementMetadata> element in _serviceMetadata.Elements.Where(ele => ele.Value.ParentElement == parentElement.ID))
            {
                string nullableString = element.Value.MinOccurs == 0 ? "?" : string.Empty;

                if (element.Value.Type == ElementType.Field)
                {
                    string dataType = GetPropertyTypeFromXsdType(element.Value.XsdValueType);

                    WriteRestrictionAnnotations(classBuilder, element.Value);
                    if (element.Value.IsTagContent)
                    {
                        classBuilder.AppendLine("    [XmlText()]");
                    }
                    else
                    {
                        classBuilder.AppendLine("    [XmlElement(\"" + element.Value.XName + "\")]");

                        // Temporary fix - as long as we use System.Text.Json for serialization and  Newtonsoft.Json for
                        // deserialization, we need both JsonProperty and JsonPropertyName annotations.
                        classBuilder.AppendLine("    [JsonProperty(\"" + element.Value.XName + "\")]");
                        classBuilder.AppendLine("    [JsonPropertyName(\"" + element.Value.XName + "\")]");
                    }

                    if (element.Value.MaxOccurs > 1)
                    {
                        classBuilder.AppendLine("    public List<" + dataType + "> " + element.Value.Name + " { get; set; }\n");
                    }
                    else
                    {
                        classBuilder.AppendLine("    public " + dataType + (dataType == "string" ? string.Empty : nullableString) + " " + element.Value.Name + " { get; set; }\n");
                    }
                }
                else if (element.Value.Type == ElementType.Group)
                {
                    WriteRestrictionAnnotations(classBuilder, element.Value);
                    classBuilder.AppendLine("    [XmlElement(\"" + element.Value.XName + "\")]");

                    // Temporary fix - as long as we use System.Text.Json for serialization and  Newtonsoft.Json for
                    // deserialization, we need both JsonProperty and JsonPropertyName annotations.
                    classBuilder.AppendLine("    [JsonProperty(\"" + element.Value.XName + "\")]");
                    classBuilder.AppendLine("    [JsonPropertyName(\"" + element.Value.XName + "\")]");

                    if (element.Value.MaxOccurs > 1)
                    {
                        classBuilder.AppendLine("    public List<" + element.Value.TypeName + "> " + element.Value.Name + " { get; set; }\n");
                    }
                    else
                    {
                        classBuilder.AppendLine("    public " + element.Value.TypeName + " " + element.Value.Name + " { get; set; }\n");
                    }

                    referredTypes.Add(element.Value);
                }
                else if (element.Value.Type == ElementType.Attribute)
                {
                    string dataType = "string";
                    if (element.Value.XsdValueType != null)
                    {
                         dataType = GetPropertyTypeFromXsdType(element.Value.XsdValueType.Value);
                    }

                    WriteRestrictionAnnotations(classBuilder, element.Value);
                    classBuilder.AppendLine("    [XmlAttribute(\"" + element.Value.XName + "\")]");
                    if (element.Value.FixedValue != null)
                    {
                        // This value is fixed so model will ignore any values posted from use. Bind Never prevents MVC Binding
                        classBuilder.AppendLine("    [BindNever]");
                        if (dataType.Equals("string"))
                        {
                            classBuilder.AppendLine("    public " + dataType + " " + element.Value.Name + " {get; set; } = \"" + element.Value.FixedValue + "\";\n");
                        }
                        else
                        {
                            classBuilder.AppendLine("    public " + dataType + " " + element.Value.Name + " {get; set;} = " + element.Value.FixedValue + ";\n");
                        }
                    }
                    else
                    {
                        classBuilder.AppendLine("    public " + dataType + " " + element.Value.Name + " { get; set; }\n");
                    }
                }
            }

            classBuilder.AppendLine("  }");

            if (!classes.ContainsKey(parentElement.TypeName))
            {
                classes.Add(parentElement.TypeName, classBuilder.ToString());
            }

            foreach (ElementMetadata refType in referredTypes)
            {
                CreateModelFromMetadataRecursive(classes, refType);
            }
        }

        private void WriteRestrictionAnnotations(StringBuilder classBuilder, ElementMetadata element)
        {
            string errorMessage = string.Empty;

            if (element.Texts.ContainsKey(TextCategoryType.Error.ToString()))
            {
                errorMessage = ", ErrorMessage = \"" + element.Texts[TextCategoryType.Error.ToString()] + "\"";
            }

            bool hasRange = false;
            if (element.Restrictions.Count > 0)
            {
                if (element.Restrictions.ContainsKey("minLength"))
                {
                    classBuilder.AppendLine("    [MinLength(" + element.Restrictions["minLength"].Value + errorMessage + ")]");
                }

                if (element.Restrictions.ContainsKey("maxLength"))
                {
                    classBuilder.AppendLine("    [MaxLength(" + element.Restrictions["maxLength"].Value + errorMessage + ")]");
                }

                if (element.Restrictions.ContainsKey("minInclusive") && element.Restrictions.ContainsKey("maxInclusive"))
                {
                    classBuilder.AppendLine("    [Range(" + element.Restrictions["minInclusive"].Value + ", " + element.Restrictions["maxInclusive"].Value + errorMessage + ")]");
                    hasRange = true;
                }

                if (element.Restrictions.ContainsKey("minimum") && element.Restrictions.ContainsKey("maximum"))
                {
                    classBuilder.AppendLine("    [Range(" + element.Restrictions["minimum"].Value + ", " + element.Restrictions["maximum"].Value + errorMessage + ")]");
                    hasRange = true;
                }

                if (element.Restrictions.ContainsKey("pattern"))
                {
                    classBuilder.AppendLine("    [RegularExpression(@\"" + element.Restrictions["pattern"].Value + "\"" + errorMessage + ")]");
                }
            }

            if (element.IsReadOnly)
            {
                classBuilder.AppendLine("    [BindNever]");
            }

            if (!element.XsdValueType.HasValue || hasRange)
            {
                return;
            }

            switch (element.XsdValueType.Value)
            {
                case BaseValueType.Double:
                    classBuilder.AppendLine("    [Range(Double.MinValue,Double.MaxValue" + errorMessage + ")]");
                    break;
                case BaseValueType.Int:
                case BaseValueType.Integer:
                    classBuilder.AppendLine("    [Range(Int32.MinValue,Int32.MaxValue" + errorMessage + ")]");
                    break;
                case BaseValueType.NegativeInteger:
                    classBuilder.AppendLine("    [Range(Int32.MinValue,-1" + errorMessage + ")]");
                    break;
                case BaseValueType.NonPositiveInteger:
                    classBuilder.AppendLine("    [Range(Int32.MinValue,0" + errorMessage + ")]");
                    break;
                case BaseValueType.NonNegativeInteger:
                    classBuilder.AppendLine("    [Range(0,Int32.MaxValue" + errorMessage + ")]");
                    break;
                case BaseValueType.PositiveInteger:
                    classBuilder.AppendLine("    [Range(1,Int32.MaxValue" + errorMessage + ")]");
                    break;
                case BaseValueType.GYear:
                    classBuilder.AppendLine("    [RegularExpression(@\"^[0-9]{4}$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.GYearMonth:
                    classBuilder.AppendLine("    [RegularExpression(@\"^[0-9]{4}-(0[1-9]|1[0-2])$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.GMonth:
                    classBuilder.AppendLine("    [RegularExpression(@\"^0[1-9]|1[0-2]$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.GDay:
                    classBuilder.AppendLine("    [RegularExpression(@\"^0[1-9]|[1,2][0-9]|3[0,1]$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.Time:
                    classBuilder.AppendLine("    [RegularExpression(@\"^([0,1][0-9]|[2][0-3]):[0-5][0-9]:[0-5][0-9](Z|(\\+|-)([0,1][0-9]|[2][0-3]):[0-5][0-9])?$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.TimePeriod:
                    classBuilder.AppendLine("    [RegularExpression(@\"^-?P([0-9]*Y)?([0-9]*M)?([0-9]*D)?(T([0-9]*H)?([0-9]*M)?([0-9]*S)?)?$\"" + errorMessage + ")]");
                    break;
                case BaseValueType.Date:
                    classBuilder.AppendLine("    [RegularExpression(@\"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1,2][0-9]|3[0,1])$\"" + errorMessage + ")]");
                    break;
            }   
        }

        private string GetPropertyTypeFromXsdType(BaseValueType? typeName)
        {
            switch (typeName)
            {
                case BaseValueType.String:
                case BaseValueType.NormalizedString:
                case BaseValueType.Token:
                case BaseValueType.GDay:
                case BaseValueType.GYear:
                case BaseValueType.GYearMonth:
                case BaseValueType.GMonth:
                case BaseValueType.Time:
                case BaseValueType.TimePeriod:
                case BaseValueType.Date:
                case null:
                    return "string";
                case BaseValueType.Int:
                    return "int";
                case BaseValueType.Short:
                    return "short";
                case BaseValueType.Decimal:
                case BaseValueType.Integer:
                case BaseValueType.PositiveInteger:
                case BaseValueType.NegativeInteger:
                case BaseValueType.NonNegativeInteger:
                case BaseValueType.NonPositiveInteger:
                    return "decimal";
                case BaseValueType.DateTime:
                    return "DateTime";
                case BaseValueType.Boolean:
                    return "bool";
                case BaseValueType.Double:
                    return "double";
                case BaseValueType.Long:
                    return "long";
            }

            throw new NotImplementedException();
        }
    }
}
