using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml;
using System.Xml.Linq;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Extensions;
using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace AltinnCore.Common.Factories.ModelFactory
{
    /// <summary>
    ///     Transforms OR XSD to metadata (Json Instance Model)
    /// </summary>
    public class SeresXsdParser
    {
        private const int MaxOccursMagicNumber = 99999;
        private readonly Random _randomGen = new Random();
        private readonly IRepository _repository;
        private readonly Dictionary<string, XDocument> secondaryXsdsByNamespace = new Dictionary<string, XDocument>();
        private Dictionary<string, XDocument> secondaryXsds;
        private XDocument xsd;
        private ISet<string> _complexTypes;

        /// <summary>
        ///     Initializes a new instance of the <see cref="SeresXsdParser" /> class
        /// </summary>
        /// <param name="repositoryService">The service repository service</param>
        public SeresXsdParser(IRepository repositoryService)
        {
            _repository = repositoryService;
        }

        /// <summary>
        ///     Parses Seres XSD into JSON
        /// </summary>
        /// <exception cref="Exception">
        ///     Throws Exception if XSD does not have root element or complexType
        /// </exception>
        /// <param name="org">The current organization</param>
        /// <param name="service">The current service</param>
        /// <param name="xsd">
        ///     Seres XSD
        /// </param>
        /// <param name="secondaryXsds">
        ///     Any secondary XSD refers from the main XSD
        /// </param>
        /// <returns>
        ///     ServiceMetadata object representing the XSD
        /// </returns>
        public ServiceMetadata ParseXsdToServiceMetadata(
            string org,
            string service,
            XDocument xsd,
            Dictionary<string, XDocument> secondaryXsds)
        {
            var serviceMetadata = new ServiceMetadata
            {
                Elements = new Dictionary<string, ElementMetadata>(),
            };
            this.xsd = xsd;
            this.secondaryXsds = secondaryXsds;

            var imports = xsd.Root.Elements(XDocName.Import);
            foreach (var import in imports)
            {
                var schemaLocation = import.AttributeValue("schemaLocation");
                secondaryXsdsByNamespace.Add(
                    import.GetPrefixOfNamespace(XNamespace.Get(import.AttributeValue("namespace"))),
                    secondaryXsds["\"" + schemaLocation + "\""]);
            }

            var rootElement = xsd.Root.Element(XDocName.Element);
            if (rootElement == null)
            {
                throw new Exception("XSD missing root element...");
            }

            var rootName = rootElement.AttributeValue("name");
            var rootTypeName = rootElement.AttributeValue("type");
            XElement rootComplexType = null;
            if (string.IsNullOrEmpty(rootTypeName))
            {
                rootElement = xsd.Root.Element(XDocName.Element);
                if (rootElement == null)
                {
                    throw new Exception("XSD without root is a bad idea...");
                }

                rootComplexType = rootElement.Element(XDocName.ComplexType);
                if (rootComplexType == null)
                {
                    throw new Exception("XSD missing root complexType...");
                }
            }
            else
            {
                rootComplexType = GetComplexTypeByNameAttribute(rootTypeName);
            }

            var rootMetadata = new ElementMetadata
            {
                ID = rootName,
                Name = rootName,
                XPath = "/" + rootName,
                Type = ElementType.Group,
                TypeName = !string.IsNullOrEmpty(rootTypeName) ? rootTypeName : rootName,
            };
            if (rootElement == null)
            {
                throw new Exception("XSD missing root complex type element...");
            }

            var existingTexts = _repository.GetServiceTexts(org, service);

            var allTexts = new CultureDictionary();

            _complexTypes = new HashSet<string>();

            // Build metadata recursively
            BuildJsonRecursive(rootComplexType, serviceMetadata.Elements, "/" + rootName, allTexts);

            foreach (var cultureString in allTexts)
            {
                if (!existingTexts.ContainsKey(cultureString.Key))
                {
                    existingTexts.Add(cultureString.Key, new Dictionary<string, string>());
                }

                foreach (var localizedString in cultureString.Value)
                {
                    if (!existingTexts[cultureString.Key].ContainsKey(localizedString.Key))
                    {
                        existingTexts[cultureString.Key].Add(localizedString.Key, localizedString.Value);
                    }
                }
            }

            _repository.SaveServiceTexts(org, service, existingTexts);

            serviceMetadata.Elements.Add(rootName, rootMetadata);

            return serviceMetadata;
        }

        private static string ShortenKeyID(KeyValuePair<string, CultureString> cultureString, string orid)
        {
            var tmpnewKey = cultureString.Key.Split('.').ToList();
            if (tmpnewKey.Contains("Value"))
            {
                tmpnewKey.Remove(tmpnewKey.SingleOrDefault(t => t.Equals("Value")));
            }

            var takeLastTwoElements = tmpnewKey.Reverse<string>().Take(2);
            var joinElements = string.Join(".", takeLastTwoElements.ToArray().Reverse());
            string newKey = $"{orid}.{joinElements}";
            return newKey;
        }

        private List<XElement> ExtractAllElementDeclarationsInTree(XElement root)
        {
            List<XElement> result = new List<XElement>();

            foreach (var element in root.Elements())
            {
                if (element.Name.Equals(XDocName.Element))
                {
                    result.Add(element);
                }
                else
                { 
                    result.AddRange(ExtractAllElementDeclarationsInTree(element));
                }
            }

            return result;
        }

        private void BuildJsonRecursive(
            XElement currentComplexType,
            Dictionary<string, ElementMetadata> allElements,
            string parentTrail, 
            CultureDictionary allTexts)
        {
            var typeName = currentComplexType.AttributeValue("name");
            if (_complexTypes.Contains(typeName))
            {
                return;
            }
            else
            {
                _complexTypes.Add(typeName);
            }

            // Process attributes
            AddAttributeElements(currentComplexType, allElements, parentTrail);

            // Iterate over children
            var sequenceElements = GetSequenceElementsFromComplexType(currentComplexType);

            if (sequenceElements.Any())
            {
                foreach (var childElement in sequenceElements)
                {
                    if (childElement.Name.Equals(XDocName.Choice))
                    {
                        // expand choice
                        var choiceElements = ExtractAllElementDeclarationsInTree(childElement);

                        foreach (var element in choiceElements)
                        {
                            string minOccurs = element.AttributeValue("minOccurs");
                            if (string.IsNullOrEmpty(minOccurs)) 
                            {
                                element.AddAttribute("minOccurs", "0");
                            }
                            else
                            {
                                element.Attribute("minOccurs").Value = "0";                                
                            }                            

                            ProcessChildElement(
                            currentComplexType,
                            element,
                            allElements,
                            parentTrail,
                            allTexts);
                        }
                    }
                    else
                    {
                        ProcessChildElement(
                            currentComplexType,
                            childElement,
                            allElements,
                            parentTrail,
                            allTexts);
                    }
                }
            }
        }

        private void ProcessChildElement(
            XElement currentComplexType,
            XElement childElement,
            Dictionary<string, ElementMetadata> allElements,
            string parentTrail,
            CultureDictionary allTexts,
            string parentName = null)
        {
            var elementMetadata = new ElementMetadata();

            var currentElement = childElement;
            var actualElement = currentElement;
            var currentIsComplex = false;
            var skipRecursive = false;
            var typeName = string.Empty;

            if (!string.IsNullOrEmpty(childElement.AttributeValue("ref")))
            {
                // Load the referenced element
                var reference = childElement.AttributeValue("ref");
                if (reference.Split(':').Count() == 2)
                {
                    var name = reference.Split(':')[0];
                    var type = reference.Split(':')[1];

                    typeName = type;
                    currentElement = GetXElementByNameAttribute(type, secondaryXsdsByNamespace[name]);
                    actualElement = currentElement;
                }
                else
                {
                    typeName = reference;
                    currentElement = GetXElementByNameAttribute(reference);
                    actualElement = currentElement;
                }
            }

            if (!string.IsNullOrEmpty(currentElement.AttributeValue("type"))
                && !currentElement.AttributeValue("type").Contains(":"))
            {
                // Load the type definition
                actualElement = GetComplexTypeByNameAttribute(currentElement.AttributeValue("type"));
                if (actualElement == null)
                {
                    actualElement = GetSimpleTypeByNameAttribute(currentElement.AttributeValue("type"));
                }
                else
                {
                    currentIsComplex = true;
                }

                typeName = currentElement.AttributeValue("type");
            }
            else
            {
                if (currentElement.Element(XDocName.SimpleType) != null)
                {
                    // Get the direct child simple type
                    typeName = currentElement.AttributeValue("name");
                    actualElement = currentElement.Element(XDocName.SimpleType);
                    currentIsComplex = false;
                }
                else
                {
                    if (currentElement.Element(XDocName.ComplexType) != null)
                    {
                        // Get the direct child complex type
                        typeName = currentElement.AttributeValue("name");
                        actualElement = currentElement.Element(XDocName.ComplexType);

                        if (actualElement.Element(XDocName.SimpleContent) != null)
                        {
                            var simpleContent = actualElement.Element(XDocName.SimpleContent);

                            ProcessSimpleContent(
                                actualElement,
                                simpleContent,
                                allElements,
                                $"{parentTrail}/{SanitizeName(typeName)}",
                                typeName.Split('.')[0]);

                            AddAttributeElements(currentElement, allElements, $"{parentTrail}/{SanitizeName(typeName)}");
                            currentIsComplex = true;
                            skipRecursive = true;
                        }
                        else
                        {
                            currentIsComplex = true;
                        }
                    }
                }
            }

            elementMetadata.XName = typeName;
            var classShortRefName = SanitizeName(typeName);
            string newTrail = $"{parentTrail}/{typeName}";

            var elementName = classShortRefName;
            if (!string.IsNullOrEmpty(currentElement.AttributeValue("name")))
            {
                elementName = SanitizeName(currentElement.AttributeValue("name"));
                elementMetadata.XName = currentElement.AttributeValue("name");

                newTrail = $"{parentTrail}/{elementName}";
            }

            elementMetadata.Name = elementName;
            elementMetadata.TypeName = classShortRefName;
            elementMetadata.XPath = newTrail;
            elementMetadata.ID = newTrail.Replace("/", ".").Substring(1);
            elementMetadata.ParentElement = parentTrail.Replace("/", ".").Substring(1);
            elementMetadata.DataBindingName = GetDataBindingName(elementMetadata.ID);

            var currentElementAnnotations = GetAnnotationsForElement(currentElement, elementMetadata.ID);
            var childElementAnnotations = GetAnnotationsForElement(childElement, elementMetadata.ID);
            var actualElementAnnotations = GetAnnotationsForElement(actualElement, elementMetadata.ID);

            foreach (var resource in childElementAnnotations)
            {
                if (!currentElementAnnotations.ContainsKey(resource.Key))
                {
                    currentElementAnnotations.Add(resource.Key, resource.Value);
                }
            }

            foreach (var resource in actualElementAnnotations)
            {
                if (!currentElementAnnotations.ContainsKey(resource.Key))
                {
                    currentElementAnnotations.Add(resource.Key, resource.Value);
                }
            }

            if (allElements.ContainsKey(elementMetadata.ID + ".Value"))
            {
                var newElementAnnotations = new CultureDictionary();
                foreach (var resourceText in currentElementAnnotations)
                {
                    var oldIdParts = resourceText.Key.Split('.').ToList();
                    oldIdParts.Insert(oldIdParts.Count - 1, "Value");
                    var newKey = string.Join(".", oldIdParts.ToArray());

                    newElementAnnotations.Add(newKey, resourceText.Value);
                }

                currentElementAnnotations = newElementAnnotations;
            }

            var orid = string.Empty;
            var xnameParts = elementMetadata.XName.Split('-');

            if ((xnameParts.Length == 3) && ((xnameParts[1] == "grp") || (xnameParts[1] == "datadef")))
            {
                orid = xnameParts[2];
            }

            foreach (var cultureString in currentElementAnnotations)
            {
                var newKey = ShortenKeyID(cultureString, orid);

                if (!allTexts.ContainsKey(cultureString.Key))
                {
                    allTexts.Add(newKey, cultureString.Value);
                }

                if (cultureString.Key.Split('.').Last().EndsWith(TextCategoryType.Label.ToString()))
                {
                    elementMetadata.Texts.Add(TextCategoryType.Label.ToString(), newKey);
                }
                else
                {
                    if (cultureString.Key.Split('.').Last().EndsWith(TextCategoryType.Help.ToString()))
                    {
                        elementMetadata.Texts.Add(TextCategoryType.Help.ToString(), newKey);
                    }
                    else
                    {
                        if (cultureString.Key.Split('.').Last().EndsWith(TextCategoryType.Error.ToString()))
                        {
                            elementMetadata.Texts.Add(TextCategoryType.Error.ToString(), newKey);
                        }
                        else
                        {
                            if (cultureString.Key.Split('.').Last().EndsWith(TextCategoryType.PlaceHolder.ToString()))
                            {
                                elementMetadata.Texts.Add(TextCategoryType.PlaceHolder.ToString(), newKey);
                            }
                        }
                    }
                }
            }

            if (allElements.ContainsKey(elementMetadata.ID + ".Value"))
            {
                allElements[elementMetadata.ID + ".Value"].Texts = elementMetadata.Texts;
                elementMetadata.Texts = new Dictionary<string, string>();
            }

            WriteRestrictions(elementMetadata, actualElement, childElement);

            string errorTextKey = null;

            if (currentElementAnnotations.Count(a => a.Key.Split('.').Last() == TextCategoryType.Error.ToString()) > 0)
            {
                errorTextKey =
                    currentElementAnnotations.FirstOrDefault(
                        a => a.Key.Split('.').Last() == TextCategoryType.Error.ToString()).Key;
            }

            if (errorTextKey != null)
            {
                foreach (var restriction in elementMetadata.Restrictions.Values)
                {
                    restriction.ErrortText = errorTextKey;
                }
            }

            if (!currentIsComplex)
            {
                elementMetadata.Type = ElementType.Field;
            }
            else
            {
                elementMetadata.Type = ElementType.Group;
                if (!skipRecursive)
                {
                    BuildJsonRecursive(actualElement, allElements, newTrail, allTexts);
                }
            }

            if (string.IsNullOrEmpty(elementMetadata.TypeName))
            {
                elementMetadata.TypeName = null; 
            }

            if (allElements.ContainsKey(elementMetadata.ID))
            {
                elementMetadata.ID += _randomGen.Next();
            }
           
            allElements.Add(elementMetadata.ID, elementMetadata);            

            AddSchemaReferenceInformation(currentComplexType, elementMetadata);
        }

        private static string SanitizeName(string name)
        {
            return name.Replace("-", string.Empty);
        }

        private static void AddSchemaReferenceInformation(XElement currentComplexType, ElementMetadata elementMetadata)
        {          
            elementMetadata.XmlSchemaXPath = GetXPathToNode(currentComplexType) + GetSubXPathToProperty(elementMetadata);
            elementMetadata.JsonSchemaPointer = "#/definitions/" + currentComplexType.AttributeValue("name") + "/properties/" + elementMetadata.Name;
            string cardinality = "[" + elementMetadata.MinOccurs + ".." + (elementMetadata.MaxOccurs < MaxOccursMagicNumber ? elementMetadata.MaxOccurs.AsString() : "*") + "]";
            string typeName = elementMetadata.TypeName ?? elementMetadata.XsdValueType.AsString();
            elementMetadata.DisplayString = elementMetadata.ID + " : " + cardinality + " " + typeName;
        }

        private static string GetSubXPathToProperty(ElementMetadata elementMetadata)
        {
            if (elementMetadata.Type.Equals("Attribute"))
            {
                return "//xsd:attribute[@name='" + elementMetadata.XName + "']";
            }
            else
            {
                return "//xsd:element[@name='" + elementMetadata.XName + "']";
            }
        }

        private static string GetXPathToNode(XObject Node)
        {
            if (Node == null)
            {
                return string.Empty;
            }

            if (Node is XAttribute attribute)
            {              
                return string.Format(
                    "{0}[@name=\"{1}\"]",
                    GetXPathToNode(Node.Parent),
                    attribute.Name.LocalName);
            }

            if (Node is XElement element)
            {
                string attributeQualifier = element.AttributeValue("name");
                if (!string.IsNullOrEmpty(attributeQualifier))
                {
                    return string.Format(
                    "{0}/xsd:{1}[@name='{2}']",
                    GetXPathToNode(Node.Parent),
                    element.Name.LocalName,
                    element.AttributeValue("name"));
                }
                else
                {
                    return string.Format(
                    "{0}/xsd:{1}",
                    GetXPathToNode(Node.Parent),
                    element.Name.LocalName);
                }                
            }

            return "error";          
        }

        private string GetDataBindingName(string id)
        {
            string[] paths = id.Split(".");
            if (paths.Last() == "Orid")
            {
                return null;
            }

            string dataBindingName = string.Empty;
            for (int i = 1; i < paths.Length; i++)
            {
                dataBindingName += char.ToLower(paths[i][0]) + paths[i].Substring(1);
                if (i < paths.Length - 1)
                {
                    dataBindingName += ".";
                }
            }

            return dataBindingName;
        }

        private CultureDictionary GetAnnotationsForElement(XElement currentElement, string currentId)
        {
            var elements = new CultureDictionary();
            if (currentElement.Element(XDocName.Annotation) != null)
            {
                var annotationElement = currentElement.Element(XDocName.Annotation);
                var documentationElements = annotationElement.Elements(XDocName.Documentation).ToList();
                if (documentationElements != null)
                {
                    foreach (var documentationElement in documentationElements)
                    {
                        var textElement = documentationElement.Element(XDocName.Tekst);
                        if (textElement != null)
                        {
                            var language = textElement.AttributeValue(XDocName.Lang);
                            var textType = textElement.AttributeValue(XDocName.TextType);
                            var text = textElement.Value;

                            var key = currentId + ".TODO";

                            if (textType == "LEDE")
                            {
                                key = currentId + "." + TextCategoryType.Label;
                            }
                            else
                            {
                                if ((textType == "HJELP") || (textType == "DEF"))
                                {
                                    key = currentId + "." + TextCategoryType.Help;
                                }
                                else
                                {
                                    if (textType == "FEIL")
                                    {
                                        key = currentId + "." + TextCategoryType.Error;
                                    }
                                    else
                                    {
                                        if (textType == "HINT")
                                        {
                                            key = currentId + "." + TextCategoryType.PlaceHolder;
                                        }
                                    }
                                }
                            }

                            CultureString cultureString;
                            if (!elements.ContainsKey(key))
                            {
                                cultureString = new CultureString();
                                elements.Add(key, cultureString);
                            }
                            else
                            {
                                cultureString = elements[key];
                            }

                            if (language == "NOB")
                            {
                                cultureString.Add("nb-NO", text);
                            }
                            else
                            {
                                if (language == "NON")
                                {
                                    cultureString.Add("nn-NO", text);
                                }
                                else
                                {
                                    if (language == "EN")
                                    {
                                        cultureString.Add("en", text);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return elements;
        }

        private void ProcessSimpleContent(
            XElement actualElement,
            XElement simpleContent,
            Dictionary<string, ElementMetadata> allElements,
            string parentTrail,
            string parentName)
        {
            var elementMetadata = new ElementMetadata
            {
                Restrictions = new Dictionary<string, Restriction>(),
            };

            string newTrail = $"{parentTrail}/Value";

            elementMetadata.IsTagContent = true;
            elementMetadata.Name = "Value";
            elementMetadata.XPath = newTrail;
            elementMetadata.ID = newTrail.Replace("/", ".").Substring(1);
            elementMetadata.ParentElement = parentTrail.Replace("/", ".").Substring(1);
            elementMetadata.MinOccurs = 1;
            elementMetadata.MaxOccurs = 1;
            elementMetadata.DataBindingName = GetDataBindingName(elementMetadata.ID);

            if (simpleContent.Element(XDocName.Extension) != null)
            {
                WriteRestrictions(elementMetadata.Restrictions, simpleContent.Element(XDocName.Extension), elementMetadata);

                AddAttributeElements(simpleContent.Element(XDocName.Extension), allElements, parentTrail);
            }

            allElements.Add(elementMetadata.ID, elementMetadata);
        }

        private void AddAttributeElements(XElement currentComplexType, Dictionary<string, ElementMetadata> allElements, string parentTrail)
        {
            if (currentComplexType == null)
            {
                return;
            }

            var attributeElements = currentComplexType.Elements(XDocName.Attribute).ToList();
            foreach (var attribute in attributeElements)
            {
                var attributeElementMetadata = new ElementMetadata();
                var attributeName = attribute.AttributeValue("name");

                if ((attribute.AttributeValue("type") != null) && attribute.AttributeValue("type").Contains(":"))
                {
                    attributeElementMetadata.XsdValueType = (BaseValueType)Enum.Parse(typeof(BaseValueType), attribute.AttributeValue("type").Split(':')[1].First().ToString().ToUpper() + string.Join(string.Empty, attribute.AttributeValue("type").Split(':')[1].Skip(1)));
                }
                else
                {
                    if (attribute.AttributeValue("ref") != null)
                    {
                        var attributeType = GetAttributeByNameAttribute(attribute.AttributeValue("ref"));

                        if ((attributeType.AttributeValue("type") != null) &&
                            attributeType.AttributeValue("type").Contains(":"))
                        {
                            attributeElementMetadata.XsdValueType = (BaseValueType)Enum.Parse(
                                typeof(BaseValueType),
                                attributeType.AttributeValue("type").Split(':')[1].First().ToString().ToUpper() + string.Join(string.Empty, attributeType.AttributeValue("type").Split(':')[1].Skip(1)));

                            if (string.IsNullOrEmpty(attributeName))
                            {
                                attributeName = attribute.AttributeValue("ref");
                            }
                        }
                    }
                }

                if (!string.IsNullOrEmpty(attribute.AttributeValue("fixed")))
                {
                    attributeElementMetadata.FixedValue = attribute.AttributeValue("fixed");
                }

                string newTrail = $"{parentTrail}/{attributeName}";

                attributeElementMetadata.XName = attributeName;
                attributeElementMetadata.Name = attributeName;
                attributeElementMetadata.XPath = newTrail;
                attributeElementMetadata.ID = newTrail.Replace("/", ".").Substring(1);
                attributeElementMetadata.ParentElement = parentTrail.Replace("/", ".").Substring(1);

                attributeElementMetadata.Type = ElementType.Attribute;

                if (allElements.ContainsKey(attributeElementMetadata.ID))
                {
                    attributeElementMetadata.ID += _randomGen.Next();
                }
                               
                allElements.Add(attributeElementMetadata.ID, attributeElementMetadata);                

                AddSchemaReferenceInformation(currentComplexType, attributeElementMetadata);
            }
        }

        private void WriteRestrictions(ElementMetadata elementMetadata, XElement element, XElement currentElement)
        {
            var restrictions = new Dictionary<string, Restriction>();

            var minOccurs = currentElement.AttributeValue("minOccurs");

            if (!string.IsNullOrEmpty(minOccurs))
            {
                elementMetadata.MinOccurs = int.Parse(minOccurs);
            }
            else
            {
                elementMetadata.MinOccurs = 1;
            }

            var maxOccurs = currentElement.AttributeValue("maxOccurs");
            if (!string.IsNullOrEmpty(maxOccurs))
            {
                if (maxOccurs == "unbounded")
                {
                    elementMetadata.MaxOccurs = MaxOccursMagicNumber; // TEMP
                }
                else
                {
                    elementMetadata.MaxOccurs = int.Parse(maxOccurs);
                }
            }
            else
            {
                elementMetadata.MaxOccurs = 1;
            }

            XElement restriction = null;

            if (element != null)
            {
                restriction = element.Element(XDocName.Restriction);
            }

            if (restriction == null)
            {
                if ((element.AttributeValue("type") != null) && element.AttributeValue("type").Contains(":"))
                {
                    elementMetadata.XsdValueType = (BaseValueType)Enum.Parse(
                        typeof(BaseValueType),
                        element.AttributeValue("type").Split(':')[1].First().ToString().ToUpper() + string.Join(string.Empty, element.AttributeValue("type").Split(':')[1].Skip(1)));
                }
            }
            else
            {
                WriteRestrictions(restrictions, restriction, elementMetadata);
            }

            elementMetadata.Restrictions = restrictions;
        }

        private void WriteRestrictions(Dictionary<string, Restriction> restrictions, XElement restriction, ElementMetadata elementMetadata)
        {
            var xsdDataType = restriction.AttributeValue("base");

            if (!xsdDataType.StartsWith("xsd:") && !xsdDataType.StartsWith("xs:"))
            {
                var baseType = GetSimpleTypeByNameAttribute(xsdDataType);
                var baseRestriction = baseType.Element(XDocName.Restriction);

                WriteRestrictions(restrictions, baseRestriction, elementMetadata);
            }
            else
            {
                if ((xsdDataType != null) && xsdDataType.Contains(":"))
                {
                    elementMetadata.XsdValueType =
                        (BaseValueType)Enum.Parse(
                            typeof(BaseValueType),
                            xsdDataType.Split(':')[1].First().ToString().ToUpper() + string.Join(string.Empty, xsdDataType.Split(':')[1].Skip(1)));
                }
            }

            var length = restriction.Element(XDocName.Length).AttributeValue("value");
            if (!string.IsNullOrEmpty(length))
            {
                CreateOrUpdateRestriction(restrictions, "length", length);
            }

            var minLength = restriction.Element(XDocName.MinLength).AttributeValue("value");
            if (!string.IsNullOrEmpty(minLength))
            {
                CreateOrUpdateRestriction(restrictions, "minLength", minLength);
            }

            var maxLength = restriction.Element(XDocName.MaxLength).AttributeValue("value");
            if (!string.IsNullOrEmpty(maxLength))
            {
                CreateOrUpdateRestriction(restrictions, "maxLength", maxLength);
            }

            var minInclusive = restriction.Element(XDocName.MinInclusive).AttributeValue("value");
            if (!string.IsNullOrEmpty(minInclusive))
            {
                CreateOrUpdateRestriction(restrictions, "minInclusive", minInclusive);
            }

            var maxInclusive = restriction.Element(XDocName.MaxInclusive).AttributeValue("value");
            if (!string.IsNullOrEmpty(maxInclusive))
            {
                CreateOrUpdateRestriction(restrictions, "maxInclusive", maxInclusive);
            }

            var totalDigits = restriction.Element(XDocName.TotalDigits).AttributeValue("value");
            if (!string.IsNullOrEmpty(totalDigits))
            {
                restrictions.Add("totalDigits", new Restriction { Value = totalDigits });
            }

            var pattern = restriction.Element(XDocName.Pattern).AttributeValue("value");
            if (!string.IsNullOrEmpty(pattern))
            {
                CreateOrUpdateRestriction(restrictions, "pattern", pattern);
            }

            var enumerations = restriction.Elements(XDocName.Enumeration);
            if ((enumerations != null) && (enumerations.Count() > 0))
            {
                var enums = string.Empty;

                foreach (var enumeration in enumerations)
                {
                    enums += enumeration.AttributeValue("value") + ";";
                }

                restrictions.Add("enumeration", new Restriction { Value = enums });
            }
        }

        private static void CreateOrUpdateRestriction(Dictionary<string, Restriction> restrictions, string propertyName, string value)
        {
            if (restrictions.ContainsKey(propertyName))
            {
                var existingRestriction = restrictions.GetValueOrDefault(propertyName);
                existingRestriction.Value = value;
            }
            else
            {
                restrictions.Add(propertyName, new Restriction { Value = value });
            }
        }

        private List<XElement> GetSequenceElementsFromComplexType(XElement complexType)
        {
            var sequenceElements = new List<XElement>();
            if (complexType != null)
            {
                var name = complexType.AttributeValue("name");

                var sequence = complexType.Element(XDocName.Sequence);
                if (sequence != null && sequence.Elements() != null)
                {
                    sequenceElements.AddRange(sequence.Elements());
                }

                var complexContent = complexType.Element(XDocName.ComplexContent);
                if (complexContent != null)
                {
                    var extension = complexContent.Element(XDocName.Extension);
                    if (extension != null)
                    {
                        var baseComplexType = GetComplexTypeByNameAttribute(extension.AttributeValue("base"));
                        sequenceElements.AddRange(GetSequenceElementsFromComplexType(baseComplexType));
                        var extensionSequence = extension.Element(XDocName.Sequence);
                        sequenceElements.AddRange(extensionSequence.Elements());
                    }
                }

                var childComplexType = complexType.Element(XDocName.ComplexType);
                if (childComplexType != null)
                {
                    var childSequence = childComplexType.Element(XDocName.Sequence);
                    if ((childSequence != null) && (childSequence.Elements() != null))
                    {
                        sequenceElements.AddRange(childSequence.Elements());
                    }
                }

                var elementsToRemove = new List<XElement>();
                var groupElements = new List<XElement>();
                foreach (
                    var sequenceElement in
                    sequenceElements.Where(
                        e =>
                            (e.Name.AsString() == XDocName.Group.AsString()) &&
                            !string.IsNullOrEmpty(e.AttributeValue("ref"))))
                {
                    var reference = sequenceElement.AttributeValue("ref");
                    groupElements.AddRange(GetSequenceElementsFromComplexType(GetGroupByNameAttribute(reference)));
                    elementsToRemove.Add(sequenceElement);
                }

                foreach (var sequenceElement in elementsToRemove)
                {
                    sequenceElements.Remove(sequenceElement);
                }

                sequenceElements.AddRange(groupElements);
            }

            return sequenceElements;
        }

        private XElement GetAttributeByNameAttribute(string nameValue)
        {
            return xsd.Descendants(XDocName.Attribute).FirstOrDefault(p => p.AttributeValue("name") == nameValue);
        }

        private XElement GetXElementByNameAttribute(string nameValue, XDocument doc = null)
        {
            if (doc == null)
            {
                return xsd.Descendants(XDocName.Element).FirstOrDefault(p => p.AttributeValue("name") == nameValue);
            }

            return doc.Descendants(XDocName.Element).FirstOrDefault(p => p.AttributeValue("name") == nameValue);
        }

        private XElement GetGroupByNameAttribute(string nameValue)
        {
            var allGroups = xsd.Descendants(XDocName.Group);
            return allGroups.FirstOrDefault(p => p.AttributeValue("name") == nameValue);
        }

        private XElement GetComplexTypeByNameAttribute(string nameValue)
        {
            return xsd.Descendants(XDocName.ComplexType).FirstOrDefault(p => p.AttributeValue("name") == nameValue);
        }

        private XElement GetSimpleTypeByNameAttribute(string nameValue)
        {
            return xsd.Descendants(XDocName.SimpleType).FirstOrDefault(p => p.AttributeValue("name") == nameValue);
        }
    }
}
