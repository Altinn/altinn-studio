using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Newtonsoft.Json.Linq;

namespace Altinn.Studio.Designer.Factories.ModelFactory
{
    /// <summary>
    /// This class is responsible for building the metadata model from JSON
    /// </summary>
    public class JsonMetadataParser
    {
        private ModelMetadata _serviceMetadata;

        /// <summary>
        /// Creates the model from JSON
        /// </summary>
        /// <param name="metadata">The JSON</param>
        /// <returns>C# code</returns>
        public string CreateModelFromJson(JObject metadata)
        {
            string rootName = string.Empty;
            Dictionary<string, string> classes = new Dictionary<string, string>();

            JProperty rootProperty = metadata.Children<JProperty>().First();
            rootName = rootProperty.Name;

            //// CreateModelFromJsonRecursive(rootProperty.Children<JObject>().First(), classes, rootName);

            return string.Empty;
        }

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

            foreach (KeyValuePair<string, ElementMetadata> group in serviceMetadata.Elements.Where(e => e.Value.Type == ElementType.Group))
            {
                StringBuilder classBuilder = new StringBuilder();
                classBuilder.AppendLine("public class " + group.Value.Name + "{");

                foreach (KeyValuePair<string, ElementMetadata> childElement in serviceMetadata.Elements.Where(e => e.Value.ParentElement == group.Value.ID))
                {
                }

                classBuilder.AppendLine("}");
            }

            var writer = new StringBuilder()
                .AppendLine("using System;")
                .AppendLine("using System.Collections.Generic;")
                .AppendLine("using System.Linq;")
                .AppendLine("using System.Threading.Tasks;")
                .AppendLine("using System.Xml.Serialization;")
                .AppendLine("using System.ComponentModel.DataAnnotations;")
                .AppendLine("using Microsoft.AspNetCore.Mvc.ModelBinding;")
                .AppendLine("namespace " + string.Format(CodeGeneration.AppNamespaceTemplate + ".Models"))
                .AppendLine("{")
                ////Append all classes
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
            classBuilder.AppendLine("public class " + parentElement.TypeName + "{");

            foreach (KeyValuePair<string, ElementMetadata> element in _serviceMetadata.Elements.Where(ele => ele.Value.ParentElement == parentElement.ID))
            {
                string nullableString = element.Value.MinOccurs == 0 ? "?" : string.Empty;

                if (element.Value.Type == ElementType.Field)
                {
                    string dataType = GetPropertyTypeFromXsdType(element.Value.XsdValueType.Value);

                    WriteRestrictionAnnotations(classBuilder, element.Value);
                    if (element.Value.IsTagContent)
                    {
                        classBuilder.AppendLine("    [XmlText()]");
                    }
                    else
                    {
                        classBuilder.AppendLine("    [XmlElement(\"" + element.Value.XName + "\")]");
                    }

                    if (element.Value.MaxOccurs > 1)
                    {
                        classBuilder.AppendLine("public List<" + dataType + "> " + element.Value.Name + " { get; set; }");
                    }
                    else
                    {
                        classBuilder.AppendLine("public " + dataType + (dataType == "string" ? string.Empty : nullableString) + " " + element.Value.Name + " { get; set; }");
                    }
                }
                else if (element.Value.Type == ElementType.Group)
                {
                    WriteRestrictionAnnotations(classBuilder, element.Value);
                    classBuilder.AppendLine("    [XmlElement(\"" + element.Value.XName + "\")]");

                    if (element.Value.MaxOccurs > 1)
                    {
                        classBuilder.AppendLine("public List<" + element.Value.TypeName + "> " + element.Value.Name + " { get; set; }");
                    }
                    else
                    {
                        classBuilder.AppendLine("public " + element.Value.TypeName + " " + element.Value.Name + " { get; set; }");
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
                            classBuilder.AppendLine("public  " + dataType + " " + element.Value.Name + " {get; set; } = \"" + element.Value.FixedValue + "\";");
                        }
                        else
                        {
                            classBuilder.AppendLine("public " + dataType + " " + element.Value.Name + " {get; set;} = " + element.Value.FixedValue + ";");
                        }
                    }
                    else
                    {
                        classBuilder.AppendLine("public " + dataType + " " + element.Value.Name + " { get; set; }");
                    }
                }
            }

            classBuilder.AppendLine("}");

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
                    classBuilder.AppendLine("[MinLength(" + element.Restrictions["minLength"].Value + errorMessage + ")]");
                }

                if (element.Restrictions.ContainsKey("maxLength"))
                {
                    classBuilder.AppendLine("[MaxLength(" + element.Restrictions["maxLength"].Value + errorMessage + ")]");
                }

                if (element.Restrictions.ContainsKey("minInclusive") && element.Restrictions.ContainsKey("maxInclusive"))
                {
                    classBuilder.AppendLine("[Range(" + element.Restrictions["minInclusive"].Value + ", " + element.Restrictions["maxInclusive"].Value + errorMessage + ")]");
                    hasRange = true;
                }

                if (element.Restrictions.ContainsKey("pattern"))
                {
                    classBuilder.AppendLine("[RegularExpression(@\"" + element.Restrictions["pattern"].Value + "\"" + errorMessage + ")]");
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
                // case BaseValueType.Decimal:
                //    classBuilder.AppendLine("[Range(Decimal.MinValue,Decimal.MaxValue)]");
                //    break;
                case BaseValueType.Double:
                    classBuilder.AppendLine("[Range(Double.MinValue,Double.MaxValue" + errorMessage + ")]");
                    break;
                case BaseValueType.Int:
                case BaseValueType.Integer:
                    classBuilder.AppendLine("[Range(Int32.MinValue,Int32.MaxValue" + errorMessage + ")]");
                    break;
                case BaseValueType.NegativeInteger:
                    classBuilder.AppendLine("[Range(Int32.MinValue,-1" + errorMessage + ")]");
                    break;
                case BaseValueType.NonPositiveInteger:
                    classBuilder.AppendLine("[Range(Int32.MinValue,0" + errorMessage + ")]");
                    break;
                case BaseValueType.PositiveInteger:
                    classBuilder.AppendLine("[Range(1,Int32.MaxValue" + errorMessage + ")]");
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
                case BaseValueType.Date:
                case BaseValueType.DateTime:
                case BaseValueType.GDay:
                case BaseValueType.GYear:
                case BaseValueType.GYearMonth:
                case BaseValueType.Month:
                case BaseValueType.Time:
                case BaseValueType.TimePeriod:
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

        private void CreateModelFromJsonRecursive(JObject currentObject, Dictionary<string, string> classes, string rootName)
        {
            //// Get basic stuff
            //   iscomplex
            //   typename
            //   propertyname
            //   restrictions
            ////

            foreach (var child in currentObject.Children<JProperty>())
            {
                classes.Add(child.Name, "TODO");

                JObject childObject = child.Children<JObject>().FirstOrDefault();

                if (childObject != null)
                {
                    // Magic
                    CreateModelFromJsonRecursive(childObject, classes, rootName);
                }
            }
        }
    }
}
