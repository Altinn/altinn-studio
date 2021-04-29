using System;
using System.Buffers;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Utils;
using Json.More;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Xml
{
    /// <summary>
    /// Visitor class for converting XML schema to Json Schema, this will produce a Json Schema with custom keywords to preserve XML schema information
    /// </summary>
    public class XmlSchemaToJsonSchemaConverter : IXmlSchemaConverter<JsonSchema>
    {
        private const string XmlSchemaNamespace = "http://www.w3.org/2001/XMLSchema";

        private XmlSchemaSet _schemaSet;

        /// <inheritdoc />
        public JsonSchema Convert(XmlSchema schema)
        {
            _schemaSet = new XmlSchemaSet();
            _schemaSet.Add(schema);
            _schemaSet.Compile();

            JsonSchemaBuilder builder = new JsonSchemaBuilder()
               .Schema(MetaSchemas.Draft202012Id)
               .Id("schema.json")
               .Type(SchemaValueType.Object)
               .XsdNamespaces(
                    schema.Namespaces
                       .ToArray()
                       .Select(ns => (ns.Name, ns.Namespace)))
               .XsdSchemaAttributes(
                    (nameof(XmlSchema.AttributeFormDefault), schema.AttributeFormDefault.ToString()),
                    (nameof(XmlSchema.ElementFormDefault), schema.ElementFormDefault.ToString()),
                    (nameof(XmlSchema.BlockDefault), schema.BlockDefault.ToString()),
                    (nameof(XmlSchema.FinalDefault), schema.FinalDefault.ToString()));

            List<(string name, JsonSchemaBuilder schema)> items = new List<(string name, JsonSchemaBuilder schema)>();

            foreach (XmlSchemaObject item in schema.Items.Cast<XmlSchemaObject>())
            {
                switch (item)
                {
                    case XmlSchemaImport:
                        throw new NotImplementedException("Schema imports are not supported by Altinn Studio");
                    case XmlSchemaRedefine:
                        throw new NotImplementedException("Redefine is not supported by Altinn Studio");
                    case XmlSchemaAnnotation x:
                        AddAnnotation(x, builder);
                        break;
                    case XmlSchemaSimpleType x:
                        items.Add((x.Name, ConvertSchemaSimpleType(x, false, false)));
                        break;
                    case XmlSchemaComplexType x:
                        items.Add((x.Name, ConvertSchemaComplexType(x, false, false)));
                        break;
                    case XmlSchemaGroup x:
                        items.Add((x.Name, ConvertSchemaGroup(x, false, false)));
                        break;
                    case XmlSchemaElement x:
                        items.Add((x.Name, ConvertSchemaElement(x, false, false)));
                        break;
                    case XmlSchemaAttribute x:
                        items.Add((x.Name, ConvertSchemaAttribute(x, false, false)));
                        break;
                    case XmlSchemaAttributeGroup x:
                        items.Add((x.Name, ConvertSchemaAttributeGroup(x, false, false)));
                        break;
                    default:
                        throw new XmlSchemaException("Unsupported global element in xml schema", null, item.LineNumber, item.LinePosition);
                }
            }

            if (items.Count > 0)
            {
                builder.Properties(items.Take(1).Select(def => (def.name, def.schema.Build())).ToArray());
            }

            if (items.Count > 1)
            {
                builder.Definitions(items.Skip(1).Select(def => (def.name, def.schema.Build())).ToArray());
            }

            return builder;
        }

        private void AddAnnotation(XmlSchemaAnnotation annotation, JsonSchemaBuilder builder)
        {
            if (annotation.Parent is XmlSchema)
            {
                AddSchemaRootAnnotation(annotation, builder);
                return;
            }

            XmlDocument doc = new XmlDocument();
            XmlElement root = doc.CreateElement("root");

            foreach (XmlSchemaObject item in annotation.Items)
            {
                XmlElement element;
                XmlNode[] markup;
                switch (item)
                {
                    case XmlSchemaAppInfo appInfo:
                        element = doc.CreateElement("appInfo");
                        markup = appInfo.Markup;
                        break;
                    case XmlSchemaDocumentation documentation:
                        element = doc.CreateElement("documentation");
                        markup = documentation.Markup;
                        break;
                    default:
                        continue;
                }

                if (markup?.Length > 0)
                {
                    foreach (XmlNode node in markup)
                    {
                        element.AppendChild(doc.ImportNode(node!, true));
                    }

                    root.AppendChild(element);
                }
            }

            if (root.HasChildNodes)
            {
                builder.Comment(root.InnerXml);
            }
        }

        /// <summary>
        /// Specifically for handling SERES schema annotation
        /// </summary>
        private void AddSchemaRootAnnotation(XmlSchemaAnnotation annotation, JsonSchemaBuilder builder)
        {
            XmlSchemaDocumentation documentation = (XmlSchemaDocumentation)annotation.Items
               .OfType<XmlSchemaObject>()
               .FirstOrDefault(obj => obj is XmlSchemaDocumentation);

            if (documentation == null)
            {
                return;
            }

            ArrayBufferWriter<byte> buffer = new ArrayBufferWriter<byte>();

            using (Utf8JsonWriter writer = new Utf8JsonWriter(buffer))
            {
                if (documentation.Markup != null)
                {
                    writer.WriteStartObject();
                    foreach (XmlNode node in documentation.Markup)
                    {
                        if (node == null)
                        {
                            continue;
                        }

                        if (XmlSchemaNamespace.Equals(node.NamespaceURI) && "attribute".Equals(node.LocalName))
                        {
                            string name = node.Attributes?["name"]?.Value;
                            string value = node.Attributes?["fixed"]?.Value;

                            if (string.IsNullOrWhiteSpace(name))
                            {
                                continue;
                            }

                            writer.WriteString(name, value);
                        }
                    }

                    writer.WriteEndObject();
                }
            }

            Utf8JsonReader reader = new Utf8JsonReader(buffer.WrittenSpan);
            JsonDocument info = JsonDocument.ParseValue(ref reader);

            builder.Info(info.RootElement);
        }

        private JsonSchemaBuilder ConvertSchemaAttribute(XmlSchemaAttribute item, bool optional, bool array)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleAttribute(item, optional, array, builder);

            return builder;
        }

        private void HandleAttribute(XmlSchemaAttribute item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            if (!item.RefName.IsEmpty)
            {
                builder.Ref(GetReferenceFromTypename(item.RefName));
                builder.XsdType("#ref");
            }
            else if (!item.SchemaTypeName.IsEmpty)
            {
                int minOccurs = (optional || item.Use == XmlSchemaUse.Optional) ? 0 : 1;
                HandleType(item.SchemaTypeName, minOccurs, 1, array, builder);
            }
            else if (item.SchemaType != null)
            {
                HandleSimpleType(item.SchemaType, optional, array, builder);
            }

            if (item.DefaultValue != null)
            {
                builder.Default(item.DefaultValue.AsJsonElement());
            }

            if (item.FixedValue != null)
            {
                builder.Const(item.FixedValue.AsJsonElement());
            }

            builder.XsdAttribute();
            AddUnhandledAttributes(item, builder);
        }

        private void HandleSimpleType(XmlSchemaSimpleType schemaType, bool optional, bool array, JsonSchemaBuilder builder)
        {
            switch (schemaType.Content)
            {
                case XmlSchemaSimpleTypeRestriction x:
                    HandleSimpleTypeRestriction(x, optional, array, builder);
                    break;
                case XmlSchemaSimpleTypeList x:
                    HandleSimpleTypeList(x, optional, array, builder);
                    break;
                case XmlSchemaSimpleTypeUnion x:
                    throw new XmlSchemaException("Altinn studio does not support xsd unions", null, x.LineNumber, x.LinePosition);
            }
        }

        private void HandleSimpleTypeRestriction(XmlSchemaSimpleTypeRestriction item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            StepsBuilder steps = new StepsBuilder();

            if (item.BaseType != null)
            {
                steps.Add(b => HandleSimpleType(item.BaseType, optional, array, b));
            }
            else if (!item.BaseTypeName.IsEmpty)
            {
                steps.Add(b => HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, b));
            }

            if (item.Facets.Count > 0)
            {
                steps.Add(b =>
                {
                    List<string> enumValues = new List<string>();
                    List<string> xsdRestrictions = new List<string>();

                    foreach (XmlSchemaFacet facet in item.Facets.Cast<XmlSchemaFacet>())
                    {
                        HandleRestrictionFacet(facet, b, ref enumValues, ref xsdRestrictions);
                    }

                    if (enumValues.Count > 0)
                    {
                        b.Enum(enumValues.Select(val => val.AsJsonElement()));
                    }
                });
            }

            steps.BuildWithAllOf(builder);
        }

        private void HandleRestrictionFacet(XmlSchemaFacet facet, JsonSchemaBuilder builder, ref List<string> enumValues, ref List<string> xsdRestrictions)
        {
            decimal dLength;
            uint uiLength;

            string xsdRestriction = facet.GetType().Name;
            xsdRestriction = xsdRestriction[9..^5];
            xsdRestriction = char.ToLowerInvariant(xsdRestriction[0]) + xsdRestriction[1..];
            xsdRestrictions.Add($"xsdRestriction:{xsdRestriction}:{facet.Value}");

            switch (facet)
            {
                case XmlSchemaEnumerationFacet:
                    enumValues.Add(facet.Value);
                    break;
                case XmlSchemaFractionDigitsFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && uint.TryParse(facet.Value, out uiLength))
                    {
                        builder.MultipleOf(1m / (decimal)Math.Pow(10, uiLength));
                    }

                    break;
                case XmlSchemaLengthFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && uint.TryParse(facet.Value, out uiLength))
                    {
                        builder.MaxLength(uiLength);
                        builder.MinLength(uiLength);
                    }

                    break;
                case XmlSchemaMaxExclusiveFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && decimal.TryParse(facet.Value, out dLength))
                    {
                        builder.ExclusiveMaximum(dLength);
                    }

                    break;
                case XmlSchemaMaxInclusiveFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && decimal.TryParse(facet.Value, out dLength))
                    {
                        builder.Maximum(dLength);
                    }

                    break;
                case XmlSchemaMaxLengthFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && uint.TryParse(facet.Value, out uiLength))
                    {
                        builder.MaxLength(uiLength);
                    }

                    break;
                case XmlSchemaMinExclusiveFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && decimal.TryParse(facet.Value, out dLength))
                    {
                        builder.ExclusiveMinimum(dLength);
                    }

                    break;
                case XmlSchemaMinInclusiveFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && decimal.TryParse(facet.Value, out dLength))
                    {
                        builder.Minimum(dLength);
                    }

                    break;
                case XmlSchemaMinLengthFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && uint.TryParse(facet.Value, out uiLength))
                    {
                        builder.MinLength(uiLength);
                    }

                    break;
                case XmlSchemaTotalDigitsFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && uint.TryParse(facet.Value, out uiLength))
                    {
                        builder.MaxLength(uiLength);
                    }

                    break;
                case XmlSchemaPatternFacet:
                    string pattern = facet.Value;
                    builder.Pattern(pattern ?? throw new NullReferenceException("value of the pattern facet cannot be null"));
                    break;
                case XmlSchemaWhiteSpaceFacet:
                    break;
                default:
                    throw new ArgumentOutOfRangeException(facet.GetType().Name);
            }
        }

        private void HandleSimpleTypeList(XmlSchemaSimpleTypeList item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            builder.Type(SchemaValueType.Array);

            JsonSchemaBuilder itemTypeSchema;
            if (item.ItemType != null)
            {
                itemTypeSchema = ConvertSchemaSimpleType(item.ItemType, optional, array);
            }
            else if (!item.ItemTypeName.IsEmpty)
            {
                itemTypeSchema = new JsonSchemaBuilder();
                HandleType(item.ItemTypeName, optional ? 0 : 1, 1, false, itemTypeSchema);
            }
            else
            {
                throw new XmlSchemaException("Invalid list definition, must include \"itemType\" or \"simpleType\"", null, item.LineNumber, item.LinePosition);
            }

            builder.Items(itemTypeSchema);
        }

        private void HandleComplexType(XmlSchemaComplexType item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder attributeDefinitions = new PropertiesBuilder();

            if (item.ContentModel != null)
            {
                switch (item.ContentModel)
                {
                    case XmlSchemaSimpleContent x:
                        steps.Add(b => HandleSimpleContent(x, optional, array, b));
                        break;
                    case XmlSchemaComplexContent x:
                        steps.Add(b => HandleComplexContent(x, optional, array, b));
                        break;
                }
            }
            else if (item.Particle != null)
            {
                switch (item.Particle)
                {
                    case XmlSchemaGroupRef x:
                        steps.Add(b => HandleGroupRef(x, b));
                        break;
                    case XmlSchemaChoice x:
                        steps.Add(b => HandleChoice(x, optional, array, b));
                        break;
                    case XmlSchemaAll x:
                        steps.Add(b => HandleAll(x, optional, array, b));
                        break;
                    case XmlSchemaSequence x:
                        steps.Add(b => HandleSequence(x, optional, array, b));
                        break;
                }
            }

            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                switch (attribute)
                {
                    case XmlSchemaAttribute x:
                        string name = x.Name ?? x.RefName.Name; 
                        attributeDefinitions.Add(name, ConvertSchemaAttribute(x, false, false), x.Use == XmlSchemaUse.Required);
                        break;
                    case XmlSchemaAttributeGroupRef x:
                        attributeDefinitions.AddCurrentPropertiesToStep(steps);
                        steps.Add(b => HandleAttributeGroupRef(x, b));
                        break;
                    default:
                        throw new XmlException("Expected attribute or attribute group reference", null, attribute.LineNumber, attribute.LinePosition);
                }
            }

            attributeDefinitions.AddCurrentPropertiesToStep(steps);

            steps.BuildWithAllOf(builder);

            if (item.AnyAttribute != null)
            {
                builder.XsdAnyAttribute();
            }
        }

        private void HandleGroupRef(XmlSchemaGroupRef item, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            builder.Ref(GetReferenceFromName(item.RefName.Name));
            builder.XsdType("#ref");
        }

        private void HandleChoice(XmlSchemaChoice choice, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(choice, builder);

            List<JsonSchema> choices = new List<JsonSchema>();

            foreach (XmlSchemaObject item in choice.Items)
            {
                switch (item)
                {
                    case XmlSchemaElement x:
                        string name = x.Name ?? x.RefName.Name;
                        JsonSchemaBuilder b = new JsonSchemaBuilder();
                        b.Properties((name, ConvertSchemaElement(x, optional, array)));
                        if (x.MinOccurs > 0)
                        {
                            b.Required(name);
                        }

                        choices.Add(b);
                        break;
                    case XmlSchemaGroupRef x:
                        choices.Add(ConvertSchemaGroupRef(x));
                        break;
                    case XmlSchemaChoice x:
                        choices.Add(ConvertSchemaChoice(x, optional, array));
                        break;
                    case XmlSchemaSequence x:
                        choices.Add(ConvertSchemaSequence(x, optional, array));
                        break;
                    case XmlSchemaAny:
                        // TODO
                        throw new NotImplementedException();
                }
            }

            if (choices.Count > 0)
            {
                builder.OneOf(choices);
                builder.XsdStructure("choice");
            }
        }

        private void HandleAll(XmlSchemaAll all, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(all, builder);

            PropertiesBuilder properties = new PropertiesBuilder();

            foreach (XmlSchemaElement element in all.Items.Cast<XmlSchemaElement>())
            {
                string name = element.Name ?? element.RefName.Name;
                properties.Add(name, ConvertSchemaElement(element, optional, array), !optional && element.MinOccurs > 0);
            }

            properties.Build(builder);
            builder.XsdStructure("all");
        }

        private void HandleSequence(XmlSchemaSequence sequence, bool optional, bool array, JsonSchemaBuilder builder)
        {
            optional = optional || sequence.MinOccurs == 0;
            array = array || sequence.MaxOccurs > 1;

            HandleAnnotation(sequence, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder properties = new PropertiesBuilder();

            foreach (XmlSchemaObject item in sequence.Items)
            {
                switch (item)
                {
                    case XmlSchemaElement x:
                        properties.Add(x.Name ?? x.RefName.Name, ConvertSchemaElement(x, optional, array), !optional && x.MinOccurs > 0);
                        break;
                    case XmlSchemaGroupRef x:
                        properties.AddCurrentPropertiesToStep(steps);
                        steps.Add(b => HandleGroupRef(x, b));
                        break;
                    case XmlSchemaChoice x:
                        properties.AddCurrentPropertiesToStep(steps);
                        steps.Add(b => HandleChoice(x, optional, array, b));
                        break;
                    case XmlSchemaSequence x:
                        properties.AddCurrentPropertiesToStep(steps);
                        steps.Add(b => HandleSequence(x, optional, array, b));
                        break;
                    case XmlSchemaAny:
                        properties.AddCurrentPropertiesToStep(steps);
                        steps.Add(b => b.XsdType("#any"));
                        break;
                }
            }

            properties.AddCurrentPropertiesToStep(steps);

            steps.BuildWithAllOf(builder);
            builder.XsdStructure("sequence");
        }

        private void HandleSimpleContent(XmlSchemaSimpleContent item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            switch (item.Content)
            {
                case XmlSchemaSimpleContentRestriction x:
                    HandleSimpleContentRestriction(x, optional, array, builder);
                    break;
                case XmlSchemaSimpleContentExtension x:
                    HandleSimpleContentExtension(x, optional, array, builder);
                    break;
            }
        }

        private void AddRestrictionFacets(ICollection<XmlSchemaFacet> facets, JsonSchemaBuilder builder)
        {
            if (facets.Count > 0)
            {
                List<string> enumValues = new List<string>();
                List<string> xsdRestrictions = new List<string>();

                foreach (XmlSchemaFacet facet in facets)
                {
                    HandleRestrictionFacet(facet, builder, ref enumValues, ref xsdRestrictions);
                }

                if (enumValues.Count > 0)
                {
                    builder.Enum(enumValues.Select(val => val.AsJsonElement()));
                }
            }
        }

        private void HandleSimpleContentRestriction(XmlSchemaSimpleContentRestriction item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder properties = new PropertiesBuilder();

            if (!item.BaseTypeName.IsEmpty)
            {
                JsonSchemaBuilder valueSchemaBuilder = new JsonSchemaBuilder();
                if (item.BaseTypeName.Namespace == XmlSchemaNamespace)
                {
                    HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, valueSchemaBuilder);
                }
                else
                {
                    XmlQualifiedName typeName = item.BaseTypeName;
                    XmlSchemaObject type = _schemaSet.GlobalTypes[typeName];

                    if (type is XmlSchemaSimpleType)
                    {
                        HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, valueSchemaBuilder);
                    }
                    else if (type is XmlSchemaComplexType)
                    {
                        steps.Add(b => HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, b));
                    }
                }

                AddRestrictionFacets(item.Facets.Cast<XmlSchemaFacet>().ToList(), valueSchemaBuilder);
                properties.Add("value", valueSchemaBuilder, false);
            }
            else if (item.BaseType != null)
            {
                JsonSchemaBuilder valueSchemaBuilder = new JsonSchemaBuilder();
                HandleSimpleType(item.BaseType, optional, array, valueSchemaBuilder);
                AddRestrictionFacets(item.Facets.Cast<XmlSchemaFacet>().ToList(), valueSchemaBuilder);
                properties.Add("value", valueSchemaBuilder, false);
            }

            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                switch (attribute)
                {
                    case XmlSchemaAttribute x:
                        properties.Add(x.Name ?? x.RefName.Name, ConvertSchemaAttribute(x, optional, array), !optional && x.Use == XmlSchemaUse.Required);
                        break;
                    case XmlSchemaAttributeGroupRef x:
                        properties.AddCurrentPropertiesToStep(steps);
                        steps.Add(b => HandleAttributeGroupRef(x, b));
                        break;
                }
            }

            properties.AddCurrentPropertiesToStep(steps);
            steps.BuildWithAllOf(builder);

            if (item.AnyAttribute != null)
            {
                builder.XsdAnyAttribute();
            }
        }

        private void HandleSimpleContentExtension(XmlSchemaSimpleContentExtension item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder properties = new PropertiesBuilder();

            JsonSchemaBuilder valueSchema = new JsonSchemaBuilder();
            HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, valueSchema);
            properties.Add("value", valueSchema, false);

            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                switch (attribute)
                {
                    case XmlSchemaAttribute x:
                        properties.Add(x.Name ?? x.RefName.Name, ConvertSchemaAttribute(x, optional, array), !optional && x.Use == XmlSchemaUse.Required);
                        break;
                    case XmlSchemaAttributeGroupRef x:
                        properties.AddCurrentPropertiesToStep(steps);
                        steps.Add(b => HandleAttributeGroupRef(x, b));
                        break;
                }
            }

            properties.AddCurrentPropertiesToStep(steps);
            steps.BuildWithAllOf(builder);

            if (item.AnyAttribute != null)
            {
                builder.XsdAnyAttribute();
            }
        }

        private void HandleComplexContent(XmlSchemaComplexContent item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            switch (item.Content)
            {
                case XmlSchemaComplexContentRestriction x:
                    HandleComplexContentRestriction(x, optional, array, builder);
                    break;
                case XmlSchemaComplexContentExtension x:
                    HandleComplexContentExtension(x, optional, array, builder);
                    break;
            }
        }

        private void HandleComplexContentRestriction(XmlSchemaComplexContentRestriction item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder properties = new PropertiesBuilder();

            steps.Add(b => HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, b));

            switch (item.Particle)
            {
                case XmlSchemaGroupRef x:
                    steps.Add(b => HandleGroupRef(x, b));
                    break;
                case XmlSchemaChoice x:
                    steps.Add(b => HandleChoice(x, optional, array, b));
                    break;
                case XmlSchemaAll x:
                    steps.Add(b => HandleAll(x, optional, array, b));
                    break;
                case XmlSchemaSequence x:
                    steps.Add(b => HandleSequence(x, false, false, b));
                    break;
            }

            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                switch (attribute)
                {
                    case XmlSchemaAttribute x:
                        properties.Add(x.Name ?? x.RefName.Name, ConvertSchemaAttribute(x, optional, array), !optional && x.Use == XmlSchemaUse.Required);
                        break;
                    case XmlSchemaAttributeGroupRef x:
                        properties.AddCurrentPropertiesToStep(steps);
                        steps.Add(b => HandleAttributeGroupRef(x, b));
                        break;
                }
            }

            properties.AddCurrentPropertiesToStep(steps);

            steps.BuildWithAllOf(builder);

            if (item.AnyAttribute != null)
            {
                builder.XsdAnyAttribute();
            }
        }

        private void HandleComplexContentExtension(XmlSchemaComplexContentExtension item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder properties = new PropertiesBuilder();

            steps.Add(b => HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, b));

            switch (item.Particle)
            {
                case XmlSchemaGroupRef x:
                    steps.Add(b => HandleGroupRef(x, b));
                    break;
                case XmlSchemaChoice x:
                    steps.Add(b => HandleChoice(x, optional, array, b));
                    break;
                case XmlSchemaAll x:
                    steps.Add(b => HandleAll(x, optional, array, b));
                    break;
                case XmlSchemaSequence x:
                    steps.Add(b => HandleSequence(x, false, false, b));
                    break;
            }

            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                switch (attribute)
                {
                    case XmlSchemaAttribute x:
                        properties.Add(x.Name ?? x.RefName.Name, ConvertSchemaAttribute(x, optional, array), !optional && x.Use == XmlSchemaUse.Required);
                        break;
                    case XmlSchemaAttributeGroupRef x:
                        properties.AddCurrentPropertiesToStep(steps);
                        steps.Add(b => HandleAttributeGroupRef(x, b));
                        break;
                }
            }

            properties.AddCurrentPropertiesToStep(steps);

            steps.BuildWithAllOf(builder);

            if (item.AnyAttribute != null)
            {
                builder.XsdAnyAttribute();
            }
        }

        private void AddUnhandledAttributes(XmlSchemaAnnotated item, JsonSchemaBuilder builder)
        {
            if (item.UnhandledAttributes != null && item.UnhandledAttributes.Length > 0)
            {
                IEnumerable<(string Name, string Value)> unhandledAttributes = item.UnhandledAttributes.Select(attr => (attr.Name, attr.Value));
                builder.XsdUnhandledAttributes(unhandledAttributes);
            }
        }

        private JsonSchemaBuilder ConvertSchemaAttributeGroup(XmlSchemaAttributeGroup item, bool optional, bool array)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleAttributeGroup(item, optional, array, builder);

            return builder;
        }

        private void HandleAttributeGroup(XmlSchemaAttributeGroup attributes, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(attributes, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder properties = new PropertiesBuilder();

            foreach (XmlSchemaObject attribute in attributes.Attributes)
            {
                switch (attribute)
                {
                    case XmlSchemaAttribute x:
                        properties.Add(x.Name ?? x.RefName.Name, ConvertSchemaAttribute(x, optional, array), !optional && x.Use == XmlSchemaUse.Required);
                        break;
                    case XmlSchemaAttributeGroupRef x:
                        properties.AddCurrentPropertiesToStep(steps);
                        steps.Add(b => HandleAttributeGroupRef(x, b));
                        break;
                }
            }

            properties.AddCurrentPropertiesToStep(steps);
            steps.BuildWithAllOf(builder);

            AddUnhandledAttributes(attributes, builder);
        }

        private void HandleAttributeGroupRef(XmlSchemaAttributeGroupRef item, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            builder.Ref(GetReferenceFromTypename(item.RefName));
            builder.XsdType("#ref");
        }

        private JsonSchemaBuilder ConvertSchemaElement(XmlSchemaElement item, bool optional, bool array)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleAnnotation(item, builder);

            if (!item.RefName.IsEmpty)
            {
                builder.Ref(GetReferenceFromTypename(item.RefName));
                builder.XsdType("#ref");
            }
            else if (!item.SchemaTypeName.IsEmpty)
            {
                HandleType(item.SchemaTypeName, optional ? 0 : item.MinOccurs, item.MaxOccurs, array, builder);
            }
            else
            {
                switch (item.SchemaType)
                {
                    case XmlSchemaSimpleType x:
                        HandleSimpleType(x, optional, array, builder);
                        break;
                    case XmlSchemaComplexType x:
                        HandleComplexType(x, optional, array, builder);
                        break;
                }
            }

            AddUnhandledAttributes(item, builder);

            return builder;
        }

        private JsonSchemaBuilder ConvertSchemaChoice(XmlSchemaChoice item, bool optional, bool array)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleChoice(item, optional, array, builder);

            return builder;
        }

        private JsonSchemaBuilder ConvertSchemaSequence(XmlSchemaSequence item, bool optional, bool array)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleSequence(item, optional, array, builder);

            return builder;
        }

        private JsonSchemaBuilder ConvertSchemaGroup(XmlSchemaGroup item, bool optional, bool array)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleGroup(item, optional, array, builder);

            return builder;
        }

        private void HandleGroup(XmlSchemaGroup grp, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(grp, builder);

            switch (grp.Particle)
            {
                case XmlSchemaChoice x:
                    HandleChoice(x, optional, array, builder);
                    break;
                case XmlSchemaAll x:
                    HandleAll(x, optional, array, builder);
                    break;
                case XmlSchemaSequence x:
                    HandleSequence(x, optional, array, builder);
                    break;
            }
        }

        private JsonSchemaBuilder ConvertSchemaGroupRef(XmlSchemaGroupRef item)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleGroupRef(item, builder);

            return builder;
        }

        private JsonSchemaBuilder ConvertSchemaSimpleType(XmlSchemaSimpleType item, bool optional, bool array)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleSimpleType(item, optional, array, builder);

            return builder;
        }

        private JsonSchemaBuilder ConvertSchemaComplexType(XmlSchemaComplexType item, bool optional, bool array)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleComplexType(item, optional, array, builder);

            return builder;
        }

        private void HandleAnnotation(XmlSchemaAnnotated item, JsonSchemaBuilder builder)
        {
            if (item.Annotation != null)
            {
                AddAnnotation(item.Annotation, builder);
            }
        }

        private static string GetReferenceFromTypename(XmlQualifiedName typeName)
        {
            if (typeName.IsEmpty)
            {
                throw new InvalidOperationException("Cannot create reference to empty type name");
            }

            return GetReferenceFromName(typeName.Name);
        }

        private static string GetReferenceFromName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new InvalidOperationException("Cannot create reference to empty name");
            }

            return $"#/definitions/{name}";
        }

        private void HandleType(XmlQualifiedName typeName, decimal minOccurs, decimal maxOccurs, bool array, JsonSchemaBuilder builder)
        {
            array = array || maxOccurs > 1;

            JsonSchemaBuilder typeBuilder = builder;

            if (GetTypeAndFormat(typeName, out SchemaValueType? type, out Format format, out string xsdType))
            {
                if (array)
                {
                    typeBuilder = new JsonSchemaBuilder();
                }

                if (type != null)
                {
                    typeBuilder.Type(type.Value);
                }
                else
                {
                    typeBuilder.Ref(GetReferenceFromTypename(typeName));
                }

                if (format != null)
                {
                    typeBuilder.Format(format);
                }

                if (array)
                {
                    if (minOccurs > 0)
                    {
                        typeBuilder.MinItems((uint)minOccurs);
                    }

                    if (maxOccurs > 1 && maxOccurs < decimal.MaxValue)
                    {
                        typeBuilder.MaxItems((uint)maxOccurs);
                    }

                    JsonSchema itemsSchema = typeBuilder;
                    typeBuilder = builder;
                    builder.Type(SchemaValueType.Array);
                    builder.Items(itemsSchema);
                }

                if (xsdType != null)
                {
                    typeBuilder.XsdType(xsdType);
                }
            }
        }

        private static bool GetTypeAndFormat(XmlQualifiedName typename, out SchemaValueType? type, out Format format, out string xsdType)
        {
            if (typename.IsEmpty)
            {
                type = null;
                format = null;
                xsdType = null;
                return false;
            }

            if (XmlSchemaNamespace.Equals(typename.Namespace))
            {
                xsdType = typename.Name;

                switch (typename.Name)
                {
                    case "boolean":
                        type = SchemaValueType.Boolean;
                        format = null;
                        return true;

                    case "integer":
                    case "nonPositiveInteger":
                    case "negativeInteger":
                    case "nonNegativeInteger":
                    case "positiveInteger":
                    case "long":
                    case "int":
                    case "short":
                    case "byte":
                    case "unsignedLong":
                    case "unsignedInt":
                    case "unsignedShort":
                    case "unsignedByte":
                        type = SchemaValueType.Integer;
                        format = null;
                        return true;

                    case "anyAtomicType":
                    case "anySimpleType":
                    case "string":
                    case "gYearMonth":
                    case "gYear":
                    case "gMonthDay":
                    case "gDay":
                    case "gMonth":
                    case "hexBinary":
                    case "base64Binary":
                    case "QName":
                    case "NOTATION":
                    case "normalizedString":
                    case "token":
                    case "language":
                    case "NMTOKEN":
                    case "Name":
                    case "NCName":
                    case "ID":
                    case "IDREF":
                    case "ENTITY":
                    case "yearMonthDuration":
                    case "dayTimeDuration":
                        type = SchemaValueType.String;
                        format = null;
                        return true;

                    case "dateTime":
                        type = SchemaValueType.String;
                        format = Formats.DateTime;
                        return true;
                    case "time":
                        type = SchemaValueType.String;
                        format = Formats.Time;
                        return true;
                    case "date":
                        type = SchemaValueType.String;
                        format = Formats.Date;
                        return true;
                    case "duration":
                        type = SchemaValueType.String;
                        format = Formats.Duration;
                        return true;
                    case "anyURI":
                        type = SchemaValueType.String;
                        format = Formats.Uri;
                        return true;

                    case "decimal":
                    case "float":
                    case "double":
                        type = SchemaValueType.Number;
                        format = null;
                        return true;

                    default:
                        throw new IndexOutOfRangeException($"Unknown in-build type '{typename}'");
                }
            }

            type = null;
            format = null;
            xsdType = null;
            return true;
        }

        private class PropertiesBuilder
        {
            private readonly List<(string name, JsonSchema schema, bool required)> _properties = new List<(string name, JsonSchema schema, bool required)>();

            public void Add(string name, JsonSchema schema, bool required)
            {
                _properties.Add((name, schema, required));
            }

            public void AddCurrentPropertiesToStep(StepsBuilder steps)
            {
                if (_properties.Count > 0)
                {
                    (string name, JsonSchema schema)[] currentProperties = _properties.Select(prop => (prop.name, prop.schema)).ToArray();
                    string[] required = _properties.Where(prop => prop.required).Select(prop => prop.name).ToArray();
                    steps.Add(b =>
                    {
                        b.Properties(currentProperties);
                        if (required.Length > 0)
                        {
                            b.Required(required);
                        }
                    });
                    _properties.Clear();
                }
            }

            public void Build(JsonSchemaBuilder builder)
            {
                if (_properties.Count > 0)
                {
                    (string name, JsonSchema schema)[] properties = _properties.Select(prop => (prop.name, prop.schema)).ToArray();
                    string[] required = _properties.Where(prop => prop.required).Select(prop => prop.name).ToArray();

                    builder.Properties(properties);
                    if (required.Length > 0)
                    {
                        builder.Required(required);
                    }

                    _properties.Clear();
                }
            }
        }

        private class StepsBuilder
        {
            private readonly List<Action<JsonSchemaBuilder>> _steps = new List<Action<JsonSchemaBuilder>>();

            public void Add(Action<JsonSchemaBuilder> step)
            {
                _steps.Add(step);
            }

            public void BuildWithAllOf(JsonSchemaBuilder builder)
            {
                builder.AllOf(_steps.Select(step =>
                {
                    JsonSchemaBuilder stepBuilder = new JsonSchemaBuilder();
                    step(stepBuilder);
                    return stepBuilder.Build();
                }));

                //if (_steps.Count == 1)
                //{
                //    _steps[0](builder);
                //}
                //else if (_steps.Count > 1)
                //{
                //    builder.AllOf(_steps.Select(step =>
                //    {
                //        JsonSchemaBuilder stepBuilder = new JsonSchemaBuilder();
                //        step(stepBuilder);
                //        return stepBuilder.Build();
                //    }));
                //}
            }
        }
    }
}
