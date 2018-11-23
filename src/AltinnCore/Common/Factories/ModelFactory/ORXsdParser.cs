using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml.Linq;
using AltinnCore.ServiceLibrary.Extensions;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Common.Factories.ModelFactory
{
    /// <summary>
    /// Transforms OR XSD to metadata
    /// </summary>
    public class ORXsdParser
    {
        private XDocument xsd = null;

        /// <summary>
        /// Initializes a new instance of the <see cref="ORXsdParser"/> class
        /// </summary>
        public ORXsdParser()
        {
        }

        /// <summary>
        /// Parses OR XSD into JSON
        /// </summary>
        /// <exception cref="Exception">
        /// Throws Exception if XSD does not have root element or complexType
        /// </exception>
        /// <param name="xsd">Oppgaveregister (OR) XSD</param>
        /// <returns>JSON structure representing the XSD</returns>
        public JObject ParseToJson(XDocument xsd)
        {
            // this.xsd = xsd;
            // XElement rootElement = xsd.Root.Element(XDocName.Element);
            // if (rootElement == null)
            // {
            //    throw new Exception("XSD without root is a bad idea...");
            // }

            // XElement rootComplexType = rootElement.Element(XDocName.ComplexType);
            // if (rootComplexType == null)
            // {
            //    throw new Exception("XSD missing root complexType..."); ;
            // }

            // string rootName = rootElement.AttributeValue("name");

            // ServiceMetadata serviceMetadata = new ServiceMetadata();
            // serviceMetadata.Elements = new Dictionary<string, ElementMetadata>();

            // ElementMetadata rootElementMetadata = new ElementMetadata();
            ////rootElementMetadata.CustomProperties

            // var writer = new JTokenWriter();
            // writer.WriteStartObject();
            // writer.WritePropertyName(rootName);
            // writer.WriteStartObject();
            // if (includeAttributes)
            // {
            //    writer.WritePropertyName("skjemanummer");
            //    writer.WriteValue(int.Parse(GetFixedAttributeValueFromAttributeName(rootComplexType.Elements(XDocName.Attribute), "skjemanummer")));

            // writer.WritePropertyName("spesifikasjonsnummer");
            //    writer.WriteValue(int.Parse(GetFixedAttributeValueFromAttributeName(rootComplexType.Elements(XDocName.Attribute), "spesifikasjonsnummer")));

            // writer.WritePropertyName("blankettnummer");
            //    writer.WriteValue(GetFixedAttributeValueFromAttributeName(rootComplexType.Elements(XDocName.Attribute), "blankettnummer"));

            // writer.WritePropertyName("tittel");
            //    writer.WriteValue(GetFixedAttributeValueFromAttributeName(rootComplexType.Elements(XDocName.Attribute), "tittel"));

            // writer.WritePropertyName("gruppeid");
            //    writer.WriteValue(int.Parse(GetFixedAttributeValueFromAttributeName(rootComplexType.Elements(XDocName.Attribute), "gruppeid")));

            // writer.WritePropertyName("etatid");
            //    writer.WriteValue(""); // TODO

            // writer.WritePropertyName("xpath");
            //    writer.WriteValue(rootName);
            // }

            // XElement rootAnnotation = rootElement.Element(XDocName.Annotation);
            // if (rootAnnotation != null && includeTexts)
            // {
            //    CultureString labels = CreateCultureStringFromXElement(rootAnnotation, "LEDE");
            //    if (labels.Count > 0)
            //    {
            //        writer.WritePropertyName("caption");
            //        writer.WriteStartObject();
            //        foreach (var label in labels)
            //        {
            //            writer.WritePropertyName(label.Key.ToString());
            //            writer.WriteValue(label.Value);
            //        }
            //        writer.WriteEndObject();
            //    }
            // }

            ////Build JSON recursively
            // BuildJsonRecursive(rootComplexType, writer, "/" + rootName, includeTexts, includeRestrictions, includeAttributes);

            // writer.WriteEndObject();
            // writer.WriteEndObject();
            ////

            return null;
        }

        /// <summary>
        /// Parses XSD into C# model
        /// </summary>
        /// <exception cref="Exception">
        /// Throws Exception if XSD does not have root element or complexType
        /// </exception>
        /// <param name="xsd">Oppgaveregister (OR) XSD</param>
        /// <returns>C# model representing the XSD</returns>
        public string ParseToModel(XDocument xsd)
        {
            this.xsd = xsd;
            XElement rootElement = xsd.Root.Element(XDocName.Element);
            if (rootElement == null)
            {
                throw new Exception("XSD without root is a bad idea...");
            }

            XElement rootComplexType = rootElement.Element(XDocName.ComplexType);
            if (rootComplexType == null)
            {
                throw new Exception("XSD missing root complexType...");
            }

            Dictionary<string, string> classes = new Dictionary<string, string>();
            string rootName = rootElement.AttributeValue("name");

            // writer.WritePropertyName("skjemanummer");
            // writer.WriteValue(int.Parse(GetFixedAttributeValueFromAttributeName(rootComplexType.Elements(XDocName.Attribute), "skjemanummer")));

            // writer.WritePropertyName("spesifikasjonsnummer");
            // writer.WriteValue(int.Parse(GetFixedAttributeValueFromAttributeName(rootComplexType.Elements(XDocName.Attribute), "spesifikasjonsnummer")));

            // writer.WritePropertyName("blankettnummer");
            // writer.WriteValue(GetFixedAttributeValueFromAttributeName(rootComplexType.Elements(XDocName.Attribute), "blankettnummer"));

            // writer.WritePropertyName("tittel");
            // writer.WriteValue(GetFixedAttributeValueFromAttributeName(rootComplexType.Elements(XDocName.Attribute), "tittel"));

            // writer.WritePropertyName("gruppeid");
            // writer.WriteValue(int.Parse(GetFixedAttributeValueFromAttributeName(rootComplexType.Elements(XDocName.Attribute), "gruppeid")));

            // writer.WritePropertyName("etatid");
            // writer.WriteValue("");

            // Build C# model classes recursively
            BuildModelRecursive(rootComplexType, classes, rootName);

            var writer = new StringBuilder()
                .AppendLine("using System;")
                .AppendLine("using System.Collections.Generic;")
                .AppendLine("using System.ComponentModel.DataAnnotations;")
                .AppendLine("using System.Linq;")
                .AppendLine("using System.Threading.Tasks;")
                .AppendLine("using System.Xml.Serialization;")
                .AppendLine()
                .AppendLine("namespace CorePoC.TestModel")
                .AppendLine("{")
                ////Append all classes
                .Append(string.Concat(classes.Values.Reverse()))
                .AppendLine("}");

            return writer.ToString();
        }

        private static CultureString CreateCultureStringFromXElement(XElement root, string attributeCondition)
        {
            CultureString cultureString = new CultureString();
            if (root.Name != XDocName.Annotation)
            {
                return cultureString;
            }

            attributeCondition = attributeCondition.ToLower();
            foreach (XElement element in root.Elements(XDocName.Documentation))
            {
                XElement textElement = element.Element(XDocName.Tekst);
                if (textElement == null)
                {
                    continue;
                }

                XAttribute type = textElement.Attribute(XDocName.TextType);
                XAttribute lang = textElement.Attribute(XDocName.Lang);

                // Skip creating if one of the elements weren't found, or the type does not match to condition
                if (type == null || lang == null || type.Value.ToLower() != attributeCondition)
                {
                    continue;
                }

                string text = element.Value;

                if (text.StartsWith("<p>"))
                {
                    text = text.Remove(0, 2);
                }

                if (text.EndsWith("<p>"))
                {
                    text = text.Remove(text.Length - 3, text.Length);
                }

                cultureString.Add(text, lang.Value);
            }

            return cultureString;
        }

        private string CreateClass(string name, string properties)
        {
            var builder = new StringBuilder()
                .Append("public class ")
                .AppendLine(name)
                .Append("{")
                .Append(properties)
                .AppendLine("}")
                .AppendLine();

            return builder.ToString();
        }

        private void BuildModelRecursive(XElement elementComplexType, Dictionary<string, string> classes, string trail)
        {
            if (elementComplexType != null && elementComplexType.Element(XDocName.Sequence) != null)
            {
                List<string> propertyNamesUsed = new List<string>();
                var propertyBuilder = new StringBuilder();
                foreach (XElement refElement in elementComplexType.Element(XDocName.Sequence).Elements())
                {
                    string refName = refElement.AttributeValue("ref");
                    string classShortRefName = refName.Split('-')[0];
                    string className = refName.Replace("-", string.Empty);
                    XElement element = GetXElementByNameAttribute(refName);
                    XElement nextComplexType = element.Element(XDocName.ComplexType);

                    if (nextComplexType != null && nextComplexType.Element(XDocName.Attribute) != null)
                    {
                        string groupId = nextComplexType.Element(XDocName.Attribute).AttributeValue("fixed");
                        ////propertyBuilder.AppendLine("public int GruppeId {get {return " + groupId +";} }");
                    }

                    // string minOccStr = refElement.AttributeValue("minOccurs");
                    // int minOccurs = string.IsNullOrEmpty(minOccStr) ? 1 : int.Parse(minOccStr);
                    // writer.AppendLine("public int MinOccurs {get {return " + groupId + ";} }");
                    ////

                    string maxOccursStr = refElement.AttributeValue("maxOccurs");
                    int maxOccurs = string.IsNullOrEmpty(maxOccursStr) ? 1 : int.Parse(maxOccursStr);

                    // Prefer annotation from ref element
                    XElement annotationElement = refElement.Element(XDocName.Annotation) ?? element.Element(XDocName.Annotation);
                    if (annotationElement != null)
                    {
                        CultureString labels = CreateCultureStringFromXElement(annotationElement, "LEDE");
                        if (labels.Count > 0)
                        {
                            propertyBuilder.AppendLine();
                            propertyBuilder.AppendLine("    /// <summary>" + labels.Get(1044).Replace("\n", string.Empty) + "</summary>"); //\n is messing with my generated code
                        }
                    }

                    string propertyDataType = className;

                    XElement simpleTypeAnnotationElement = null;
                    if (nextComplexType != null && nextComplexType.Element(XDocName.SimpleContent) != null)
                    {
                        XElement extension = nextComplexType.Element(XDocName.SimpleContent).Element(XDocName.Extension);
                        string simpleTypeName = extension.AttributeValue("base");
                        XElement simpleType = xsd.Descendants(XDocName.SimpleType).FirstOrDefault(p => XmlToLinqExtensions.AttributeValue(p, "name") == simpleTypeName);
                        simpleTypeAnnotationElement = simpleType.Element(XDocName.Annotation);
                        XElement restriction = simpleType.Element(XDocName.Restriction);

                        // int orid = int.Parse(extension.Element(XDocName.Attribute).AttributeValue("fixed"));
                        // writer.WritePropertyName("orid");
                        // writer.WriteValue(orid);
                        ////

                        string xsdDataType = restriction.AttributeValue("base").ToLower();
                        switch (xsdDataType)
                        {
                            case "xs:string":
                            case "xs:normalizedstring":
                                propertyDataType = "string";
                                break;
                            case "xs:int":
                                propertyDataType = "int";
                                break;
                            case "xs:short":
                                propertyDataType = "short";
                                break;
                            case "xs:decimal":
                            case "xs:integer":
                            case "xs:negativeinteger":
                            case "xs:positiveinteger":
                            case "xs:nonnegativeinteger":
                            case "xs:nonpositiveinteger":
                                propertyDataType = "decimal";
                                break;
                            case "xs:date":
                            case "xs:datetime":
                            case "xs:gday":
                            case "xs:gmonthday":
                            case "xs:gyear":
                            case "xs:gyearmonth":
                            case "xs:month":
                            case "xs:time":
                            case "xs:timeperiod":
                                propertyDataType = "DateTime";
                                break;
                            case "xs:boolean":
                                propertyDataType = "bool";
                                break;
                            case "xs:double":
                                propertyDataType = "double";
                                break;
                            case "xs:long":
                                propertyDataType = "long";
                                break;
                        }

                        // string length = restriction.Element(XDocName.Length).AttributeValue("value");
                        // if (!string.IsNullOrEmpty(length))
                        // {
                        //    writer.WritePropertyName("length");
                        //    writer.WriteValue(int.Parse(length));
                        // }
                        ////

                        string minLength = restriction.Element(XDocName.MinLength).AttributeValue("value");
                        if (!string.IsNullOrEmpty(minLength))
                        {
                            propertyBuilder.AppendLine("    [MinLength(" + minLength + ")]");
                        }

                        string maxLength = restriction.Element(XDocName.MaxLength).AttributeValue("value");
                        if (!string.IsNullOrEmpty(maxLength))
                        {
                            propertyBuilder.AppendLine("    [MaxLength(" + maxLength + ")]");
                        }

                        string minInclusive = restriction.Element(XDocName.MinInclusive).AttributeValue("value");
                        string maxInclusive = restriction.Element(XDocName.MaxInclusive).AttributeValue("value");
                        if (!string.IsNullOrEmpty(minInclusive) && !string.IsNullOrEmpty(maxInclusive))
                        {
                            propertyBuilder.AppendLine("    [Range(" + minInclusive + ", " + maxInclusive + ")]");
                        }

                        // string totalDigits = restriction.Element(XDocName.TotalDigits).AttributeValue("value");
                        // if (!string.IsNullOrEmpty(totalDigits))
                        // {
                        //    writer.WritePropertyName("totalDigits");
                        //    writer.WriteValue(int.Parse(totalDigits));
                        // }
                        ////

                        string pattern = restriction.Element(XDocName.Pattern).AttributeValue("value");
                        if (!string.IsNullOrEmpty(pattern))
                        {
                            propertyBuilder.AppendLine("    [RegularExpression(@\"" + pattern + "\")]");
                        }

                        // IEnumerable<XElement> enumerations = restriction.Elements(XDocName.Enumeration);
                        // if (enumerations != null && enumerations.Count() > 0)
                        // {
                        //    writer.WritePropertyName("enums");
                        //    writer.WriteStartArray();
                        //    foreach (var enumeration in enumerations)
                        //    {
                        //        writer.WriteValue(enumeration.AttributeValue("value"));
                        //    }
                        //    writer.WriteEndArray();
                        // }
                    }

                    // handle "bad" xsd with duplicate names in same group
                    if (propertyNamesUsed.Contains(classShortRefName))
                    {
                        classShortRefName += "2";
                    }

                    if (maxOccurs > 1)
                    {
                        propertyDataType = "List<" + propertyDataType + ">";
                    }

                    propertyBuilder.AppendLine("    [XmlElement(\"" + refName + "\")]");
                    propertyBuilder.AppendLine("    public " + propertyDataType + " " + classShortRefName + " {get; set;}");
                    propertyNamesUsed.Add(classShortRefName);

                    // Magic
                    BuildModelRecursive(nextComplexType, classes, className);
                }

                // Add class with properties
                classes.Add(trail, CreateClass(trail, propertyBuilder.ToString()));
            }
        }

        private void BuildJsonRecursive(XElement elementComplexType, JTokenWriter writer, string parentTrail, bool includeTexts = true, bool includeRestrictions = true, bool includeAttributes = true)
        {
            if (elementComplexType != null && elementComplexType.Element(XDocName.Sequence) != null)
            {
                List<string> propertyNamesUsed = new List<string>();
                foreach (XElement refElement in elementComplexType.Element(XDocName.Sequence).Elements())
                {
                    string refName = refElement.AttributeValue("ref");
                    string classShortRefName = refName.Split('-')[0];
                    string newTrail = $"{parentTrail}/{refName}";
                    XElement element = GetXElementByNameAttribute(refName);
                    XElement nextComplexType = element.Element(XDocName.ComplexType);

                    // handle "bad" xsd with duplicate names in same group
                    if (propertyNamesUsed.Contains(classShortRefName))
                    {
                        classShortRefName += "2";
                    }

                    propertyNamesUsed.Add(classShortRefName);

                    writer.WritePropertyName(classShortRefName);
                    writer.WriteStartObject();

                    if (includeAttributes)
                    {
                        if (nextComplexType != null && nextComplexType.Element(XDocName.Attribute) != null)
                        {
                            string groupId = nextComplexType.Element(XDocName.Attribute).AttributeValue("fixed");
                            writer.WritePropertyName("gruppeid");
                            writer.WriteValue(int.Parse(groupId));
                        }

                        writer.WritePropertyName("serializedName");
                        writer.WriteValue(refName);

                        writer.WritePropertyName("xpath");
                        writer.WriteValue(newTrail);
                    }

                    if (includeRestrictions)
                    {
                        writer.WritePropertyName("minOccurs");
                        string minOccurs = refElement.AttributeValue("minOccurs");
                        writer.WriteValue(string.IsNullOrEmpty(minOccurs) ? 1 : int.Parse(minOccurs));

                        writer.WritePropertyName("maxOccurs");
                        string maxOccurs = refElement.AttributeValue("maxOccurs");
                        writer.WriteValue(string.IsNullOrEmpty(maxOccurs) ? 1 : int.Parse(maxOccurs));
                    }

                    XElement simpleTypeAnnotationElement = null;
                    if (nextComplexType != null && nextComplexType.Element(XDocName.SimpleContent) != null)
                    {
                        XElement extension = nextComplexType.Element(XDocName.SimpleContent).Element(XDocName.Extension);
                        string simpleTypeName = extension.AttributeValue("base");
                        XElement simpleType = xsd.Descendants(XDocName.SimpleType).FirstOrDefault(p => XmlToLinqExtensions.AttributeValue(p, "name") == simpleTypeName);
                        simpleTypeAnnotationElement = simpleType.Element(XDocName.Annotation);
                        XElement restriction = simpleType.Element(XDocName.Restriction);

                        if (includeAttributes)
                        {
                            int orid = int.Parse(extension.Element(XDocName.Attribute).AttributeValue("fixed"));
                            writer.WritePropertyName("orid");
                            writer.WriteValue(orid);
                        }

                        if (includeRestrictions)
                        {
                            string xsdDataType = restriction.AttributeValue("base");
                            writer.WritePropertyName("xsdDataType");
                            writer.WriteValue(xsdDataType);

                            string length = restriction.Element(XDocName.Length).AttributeValue("value");
                            if (!string.IsNullOrEmpty(length))
                            {
                                writer.WritePropertyName("length");
                                writer.WriteValue(int.Parse(length));
                            }

                            string minLength = restriction.Element(XDocName.MinLength).AttributeValue("value");
                            if (!string.IsNullOrEmpty(minLength))
                            {
                                writer.WritePropertyName("minLength");
                                writer.WriteValue(int.Parse(minLength));
                            }

                            string maxLength = restriction.Element(XDocName.MaxLength).AttributeValue("value");
                            if (!string.IsNullOrEmpty(maxLength))
                            {
                                writer.WritePropertyName("maxLength");
                                writer.WriteValue(int.Parse(maxLength));
                            }

                            string minInclusive = restriction.Element(XDocName.MinInclusive).AttributeValue("value");
                            if (!string.IsNullOrEmpty(minInclusive))
                            {
                                writer.WritePropertyName("minInclusive");
                                writer.WriteValue(int.Parse(minInclusive));
                            }

                            string maxInclusive = restriction.Element(XDocName.MaxInclusive).AttributeValue("value");
                            if (!string.IsNullOrEmpty(maxInclusive))
                            {
                                writer.WritePropertyName("maxInclusive");
                                writer.WriteValue(int.Parse(maxInclusive));
                            }

                            string totalDigits = restriction.Element(XDocName.TotalDigits).AttributeValue("value");
                            if (!string.IsNullOrEmpty(totalDigits))
                            {
                                writer.WritePropertyName("totalDigits");
                                writer.WriteValue(int.Parse(totalDigits));
                            }

                            string pattern = restriction.Element(XDocName.Pattern).AttributeValue("value");
                            if (!string.IsNullOrEmpty(pattern))
                            {
                                writer.WritePropertyName("pattern");
                                writer.WriteValue(pattern);
                            }

                            IEnumerable<XElement> enumerations = restriction.Elements(XDocName.Enumeration);
                            if (enumerations != null && enumerations.Count() > 0)
                            {
                                writer.WritePropertyName("enums");
                                writer.WriteStartArray();
                                foreach (var enumeration in enumerations)
                                {
                                    writer.WriteValue(enumeration.AttributeValue("value"));
                                }

                                writer.WriteEndArray();
                            }
                        }
                    }

                    // Prefer annotation from ref element
                    XElement annotationElement = refElement.Element(XDocName.Annotation) ?? element.Element(XDocName.Annotation);
                    if (annotationElement != null && includeTexts)
                    {
                        CultureString labels = CreateCultureStringFromXElement(annotationElement, "LEDE");
                        if (labels.Count > 0)
                        {
                            writer.WritePropertyName("caption");
                            writer.WriteStartObject();
                            foreach (var label in labels)
                            {
                                writer.WritePropertyName(label.Key.ToString());
                                writer.WriteValue(label.Value);
                            }

                            writer.WriteEndObject();
                        }

                        CultureString helptexts = CreateCultureStringFromXElement(annotationElement, "HJELP");
                        if (helptexts.Count > 0)
                        {
                            writer.WritePropertyName("help");
                            writer.WriteStartObject();
                            foreach (var text in helptexts)
                            {
                                writer.WritePropertyName(text.Key.ToString());
                                writer.WriteValue(text.Value);
                            }

                            writer.WriteEndObject();
                        }

                        CultureString hinttexts = CreateCultureStringFromXElement(annotationElement, "HINT");
                        if (hinttexts.Count > 0)
                        {
                            writer.WritePropertyName("hint");
                            writer.WriteStartObject();
                            foreach (var text in hinttexts)
                            {
                                writer.WritePropertyName(text.Key.ToString());
                                writer.WriteValue(text.Value);
                            }

                            writer.WriteEndObject();
                        }

                        CultureString errortexts = CreateCultureStringFromXElement(annotationElement, "FEIL");
                        if (simpleTypeAnnotationElement != null && errortexts.Count == 0)
                        {
                            errortexts = CreateCultureStringFromXElement(simpleTypeAnnotationElement, "FEIL");
                        }

                        if (errortexts.Count > 0)
                        {
                            writer.WritePropertyName("error");
                            writer.WriteStartObject();
                            foreach (var text in errortexts)
                            {
                                writer.WritePropertyName(text.Key.ToString());
                                writer.WriteValue(text.Value);
                            }

                            writer.WriteEndObject();
                        }
                    }

                    // Magic
                    BuildJsonRecursive(nextComplexType, writer, newTrail, includeTexts, includeRestrictions, includeAttributes);

                    writer.WriteEndObject();
                }
            }
        }

        private string GetFixedAttributeValueFromAttributeName(IEnumerable<XElement> elements, string attributeName)
        {
            XElement element =
                elements.FirstOrDefault(p => p.Name == XDocName.Attribute && p.Attribute("name") != null && p.AttributeValue("name") == attributeName);
            if (element == null)
            {
                return string.Empty;
            }

            return element.Attribute("fixed").Value;
        }

        private XElement GetXElementByNameAttribute(string nameValue)
        {
            return xsd.Descendants(XDocName.Element).FirstOrDefault(p => XmlToLinqExtensions.AttributeValue(p, "name") == nameValue);
        }
    }
}
