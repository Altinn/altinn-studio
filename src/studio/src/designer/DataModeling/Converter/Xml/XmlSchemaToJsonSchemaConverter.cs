using System;
using System.Buffers;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Interfaces;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Formats;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Xml
{
    /// <summary>
    /// Visitor class for converting XML schema to Json Schema, this will produce a Json Schema with custom keywords to preserve XML schema information
    /// </summary>
    public class XmlSchemaToJsonSchemaConverter : IXmlSchemaToJsonSchemaConverter
    {
        private const string XmlSchemaNamespace = "http://www.w3.org/2001/XMLSchema";

        /// <inheritdoc/>
        public JsonSchema Convert(XmlSchema schema)
        {
            var uri = new Uri("schema.json", UriKind.Relative);
            return Convert(schema, uri);
        }

        /// <inheritdoc/>
        public JsonSchema Convert(XmlSchema schema, Uri schemaUri)
        {
            var schemaSet = new XmlSchemaSet();
            schemaSet.Add(schema);
            schemaSet.Compile();

            JsonSchemaBuilder builder = new JsonSchemaBuilder()
               .Schema(MetaSchemas.Draft202012Id)
               .Id(schemaUri.OriginalString)
               .Type(SchemaValueType.Object)
               .XsdNamespaces(
                    schema.Namespaces
                       .ToArray()
                       .Select(ns => (ns.Name, ns.Namespace)))
               .XsdSchemaAttributes(schema.XsdAttributes().ToArray());

            if (schema.UnhandledAttributes is not null)
            {
                builder.XsdUnhandledAttributes(schema.UnhandledAttributes.Select(a => (a.Name, a.Value)));
            }

            List<(string Name, JsonSchemaBuilder Schema, bool PotentialRootElement)> items = new List<(string Name, JsonSchemaBuilder Schema, bool PotentialRootElement)>();

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
                        items.Add((x.Name, ConvertSchemaSimpleType(x, false, false), false));
                        break;
                    case XmlSchemaComplexType x:
                        items.Add((x.Name, ConvertSchemaComplexType(x, false, false), false));
                        break;
                    case XmlSchemaGroup x:
                        items.Add((x.Name, ConvertSchemaGroup(x, false, false), false));
                        break;
                    case XmlSchemaElement x:
                        items.Add((x.Name, ConvertSchemaElement(x, false, false), true));
                        break;
                    case XmlSchemaAttribute x:
                        items.Add((x.Name, ConvertSchemaAttribute(x, false, false), false));
                        break;
                    case XmlSchemaAttributeGroup x:
                        items.Add((x.Name, ConvertSchemaAttributeGroup(x, false, false), false));
                        break;
                    default:
                        throw new XmlSchemaException("Unsupported global element in xml schema", null, item.LineNumber, item.LinePosition);
                }
            }

            var potentialRoots = items.Where(item => item.PotentialRootElement).ToList();
            (string Name, JsonSchema Schema)? root = null;
            if (potentialRoots.Count > 0)
            {
                root = (potentialRoots[0].Name, potentialRoots[0].Schema);
            }

            if (root.HasValue)
            {
                var (rootName, rootSchema) = root.Value;

                if (!string.IsNullOrWhiteSpace(rootName))
                {
                    builder.XsdRootElement(rootName);
                }

                if (rootSchema.TryGetKeyword(out RefKeyword messageTypeReference))
                {
                    var messageTypeReferenceBuilder = new JsonSchemaBuilder();
                    messageTypeReferenceBuilder.Add(messageTypeReference);

                    builder.OneOf(messageTypeReferenceBuilder);
                }
                else
                {
                    // Inline root message
                    foreach (var keyword in rootSchema.Keywords.Filter(typeof(SchemaKeyword), typeof(IdKeyword), typeof(TypeKeyword), typeof(XsdNamespacesKeyword), typeof(XsdSchemaAttributesKeyword)))
                    {
                        builder.Add(keyword);
                    }
                }
            }

            var definitions = items
                .Where(def => def.Name != root?.Name)
                .Select(def => (def.Name, def.Schema.Build()))
                .ToArray();

            if (definitions.Any())
            {
                builder.Defs(definitions);
            }

            var normalizer = new JsonSchemaNormalizer();
            return normalizer.Normalize(builder);
        }

        private static void AddAnnotation(XmlSchemaAnnotation annotation, JsonSchemaBuilder builder)
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
        private static void AddSchemaRootAnnotation(XmlSchemaAnnotation annotation, JsonSchemaBuilder builder)
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
                HandleType(item.SchemaTypeName, minOccurs, 1, array, false, builder);
            }
            else if (item.SchemaType != null)
            {
                HandleSimpleType(item.SchemaType, optional, array, builder);
            }

            if (item.DefaultValue != null)
            {
                builder.Default(item.DefaultValue);
            }

            if (item.FixedValue != null)
            {
                builder.Const(item.FixedValue);
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
            var steps = new StepsBuilder();
            var hasRestrictions = item.Facets.Count > 0;
            var hasPrimitiveBase = !item.BaseTypeName.IsEmpty && XmlSchemaTypes.IsKnownXmlSchemaType(item.BaseTypeName);

            // Only for non-primitive type with restrictions. Can't mix ref keyword with restrictions.
            var shouldBuildWithAllOf = !hasPrimitiveBase && hasRestrictions;
            if (item.BaseType != null)
            {
                HandleSimpleType(item.BaseType, optional, array, builder);
            }
            else if (shouldBuildWithAllOf)
            {
                steps.Add(b => HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, false, b));
            }
            else
            {
                HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, false, builder);
            }

            builder.XsdStructure(nameof(XmlSchemaSimpleTypeRestriction));

            if (shouldBuildWithAllOf)
            {
                steps.Add(b => AddSimpleTypeRestrictionFacets(item, b));
                steps.BuildWithAllOf(builder);
                return;
            }

            AddSimpleTypeRestrictionFacets(item, builder);
        }

        private static void AddSimpleTypeRestrictionFacets(XmlSchemaSimpleTypeRestriction item, JsonSchemaBuilder b)
        {
            if (item.Facets.Count == 0)
            {
                return;
            }

            var enumValues = new List<string>();
            var xsdRestrictions = new List<string>();

            foreach (var facet in item.Facets.Cast<XmlSchemaFacet>())
            {
                HandleRestrictionFacet(facet, b, ref enumValues, ref xsdRestrictions);
            }

            if (enumValues.Count > 0)
            {
                AddUnhandledEnumAttributes(item, b);
                b.Enum(enumValues);
            }
        }

        private static void HandleRestrictionFacet(XmlSchemaFacet facet, JsonSchemaBuilder builder, ref List<string> enumValues, ref List<string> xsdRestrictions)
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
                    if (RestrictionsHelper.IsRestrictionOnDateType(facet))
                    {
                        builder.FormatExclusiveMaximum(facet.Value);
                    }
                    else if (TryParseDecimal(facet.Value, out dLength))
                    {
                        builder.ExclusiveMaximum(dLength);
                    }

                    break;
                case XmlSchemaMaxInclusiveFacet:
                    if (RestrictionsHelper.IsRestrictionOnDateType(facet))
                    {
                        builder.FormatMaximum(facet.Value);
                    }
                    else if (TryParseDecimal(facet.Value, out dLength))
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
                    if (RestrictionsHelper.IsRestrictionOnDateType(facet))
                    {
                        builder.FormatExclusiveMinimum(facet.Value);
                    }
                    else if (TryParseDecimal(facet.Value, out dLength))
                    {
                        builder.ExclusiveMinimum(dLength);
                    }

                    break;
                case XmlSchemaMinInclusiveFacet:
                    if (RestrictionsHelper.IsRestrictionOnDateType(facet))
                    {
                        builder.FormatMinimum(facet.Value);
                    }
                    else if (TryParseDecimal(facet.Value, out dLength))
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
                        builder.XsdTotalDigits(uiLength);
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
                HandleType(item.ItemTypeName, optional ? 0 : 1, 1, false, false, itemTypeSchema);
            }
            else
            {
                throw new XmlSchemaException("Invalid list definition, must include \"itemType\" or \"simpleType\"", null, item.LineNumber, item.LinePosition);
            }

            builder.Items(itemTypeSchema);
        }

        private void HandleComplexType(XmlSchemaComplexType item, bool optional, bool array, bool nillable, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder attributeDefinitions = new PropertiesBuilder();

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
                        if (nillable)
                        {
                            steps.Add(b => HandleNillable(x, optional, array, b));
                        }
                        else
                        {
                            steps.Add(b => HandleSequence(x, optional, array, b));
                        }

                        break;
                }
            }

            steps.BuildWithAllOf(builder);

            AddAnyAttribute(item.AnyAttribute, builder);

            AddUnhandledAttributes(item, builder);
        }

        private void HandleNillable(XmlSchemaSequence sequence, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleSequence(sequence, optional, array, builder);
            builder.XsdNillable(true);
        }

        private static void HandleGroupRef(XmlSchemaGroupRef item, JsonSchemaBuilder builder)
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
                        throw new NotImplementedException();
                }
            }

            if (choices.Count > 0)
            {
                builder.OneOf(choices);
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

        private static void AddRestrictionFacets(ICollection<XmlSchemaFacet> facets, JsonSchemaBuilder builder)
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
                    builder.Enum(enumValues);
                }
            }
        }

        private void HandleSimpleContentRestriction(XmlSchemaSimpleContentRestriction item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            var steps = new StepsBuilder();
            var properties = new PropertiesBuilder();

            if (item.BaseTypeName.IsEmpty)
            {
                throw new XmlSchemaConvertException("base is required on simpleContent/restriction");
            }

            // base type name must be present and refer to a ComplexType/SimpleContent[Restriction/Extension]
            steps.Add(b => HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, false, b));

            var valueRestrictionsBuilder = new JsonSchemaBuilder();
            AddRestrictionFacets(item.Facets.Cast<XmlSchemaFacet>().ToList(), valueRestrictionsBuilder);

            if (item.BaseType != null)
            {
                var valueBuilder = new JsonSchemaBuilder();
                HandleSimpleType(item.BaseType, optional, array, valueBuilder);
                var allOfSchemas = new List<JsonSchema>
                {
                    valueBuilder
                };
                var valueRestrictionsSchema = valueRestrictionsBuilder.Build();
                if (valueRestrictionsSchema.Keywords?.Count > 0)
                {
                    allOfSchemas.Add(valueRestrictionsSchema);
                }

                properties.Add("value", new JsonSchemaBuilder().AllOf(allOfSchemas), false);
            }
            else
            {
                properties.Add("value", valueRestrictionsBuilder, false);
            }

            AddAttributes(item.Attributes, optional, array, steps, properties);

            properties.AddCurrentPropertiesToStep(steps);
            steps.BuildWithAllOf(builder);

            AddAnyAttribute(item.AnyAttribute, builder);
        }

        private void HandleSimpleContentExtension(XmlSchemaSimpleContentExtension item, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(item, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder properties = new PropertiesBuilder();

            JsonSchemaBuilder valueSchema = new JsonSchemaBuilder();
            valueSchema.XsdText(true);
            HandleType(item.BaseTypeName, optional ? 0 : 1, 1, array, false, valueSchema);
            properties.Add("value", valueSchema, true);

            AddAttributes(item.Attributes, optional, array, steps, properties);

            properties.AddCurrentPropertiesToStep(steps);
            steps.BuildWithAllOf(builder);

            AddAnyAttribute(item.AnyAttribute, builder);
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

        private void HandleComplexContentRestriction(XmlSchemaComplexContentRestriction complexContentRestriction, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(complexContentRestriction, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder properties = new PropertiesBuilder();

            steps.Add(b => HandleType(complexContentRestriction.BaseTypeName, optional ? 0 : 1, 1, array, false, b));

            HandleParticle(complexContentRestriction.Particle, optional, array, steps);

            AddAttributes(complexContentRestriction.Attributes, optional, array, steps, properties);

            properties.AddCurrentPropertiesToStep(steps);

            steps.BuildWithAllOf(builder);

            AddAnyAttribute(complexContentRestriction.AnyAttribute, builder);
        }

        private void HandleComplexContentExtension(XmlSchemaComplexContentExtension complexConentExtension, bool optional, bool array, JsonSchemaBuilder builder)
        {
            HandleAnnotation(complexConentExtension, builder);

            StepsBuilder steps = new StepsBuilder();
            PropertiesBuilder properties = new PropertiesBuilder();

            steps.Add(b => HandleType(complexConentExtension.BaseTypeName, optional ? 0 : 1, 1, array, false, b));

            HandleParticle(complexConentExtension.Particle, optional, array, steps);

            AddAttributes(complexConentExtension.Attributes, optional, array, steps, properties);

            properties.AddCurrentPropertiesToStep(steps);

            steps.BuildWithAllOf(builder);

            AddAnyAttribute(complexConentExtension.AnyAttribute, builder);
        }

        private void HandleParticle(XmlSchemaParticle particle, bool optional, bool array, StepsBuilder steps)
        {
            switch (particle)
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
        }

        private void AddAttributes(XmlSchemaObjectCollection attributes, bool optional, bool array, StepsBuilder stepsBuilder, PropertiesBuilder propertiesBuilder)
        {
            foreach (XmlSchemaObject attribute in attributes)
            {
                switch (attribute)
                {
                    case XmlSchemaAttribute x:
                        propertiesBuilder.Add(x.Name ?? x.RefName.Name, ConvertSchemaAttribute(x, optional, array), !optional && x.Use == XmlSchemaUse.Required);
                        break;
                    case XmlSchemaAttributeGroupRef x:
                        propertiesBuilder.AddCurrentPropertiesToStep(stepsBuilder);
                        stepsBuilder.Add(b => HandleAttributeGroupRef(x, b));
                        break;
                }
            }
        }

        private static void AddUnhandledAttributes(XmlSchemaAnnotated item, JsonSchemaBuilder builder)
        {
            if (item.UnhandledAttributes != null && item.UnhandledAttributes.Length > 0)
            {
                IEnumerable<(string Name, string Value)> unhandledAttributes = item.UnhandledAttributes.Select(attr => (attr.Name, attr.Value));
                builder.XsdUnhandledAttributes(unhandledAttributes);
            }
        }

        private static void AddUnhandledEnumAttributes(XmlSchemaSimpleTypeRestriction item, JsonSchemaBuilder builder)
        {
            var namedKeyValuePairsList = new List<NamedKeyValuePairs>();

            foreach (XmlSchemaFacet facet in item.Facets.Cast<XmlSchemaFacet>())
            {
                if (facet.UnhandledAttributes != null && facet.UnhandledAttributes.Length > 0)
                {
                    var namedKeyValuePairs = new NamedKeyValuePairs(facet.Value);
                    facet.UnhandledAttributes.ToList().ForEach(a => namedKeyValuePairs.Add(a.Name, a.Value));
                    namedKeyValuePairsList.Add(namedKeyValuePairs);
                }
            }

            if (namedKeyValuePairsList.Count > 0)
            {
                builder.XsdUnhandledEnumAttributes(namedKeyValuePairsList);
            }
        }

        private static void AddAnyAttribute(XmlSchemaAnyAttribute anyAttribute, JsonSchemaBuilder builder)
        {
            if (anyAttribute == null)
            {
                return;
            }

            builder.XsdAnyAttribute(anyAttribute.Id, anyAttribute.Namespace, anyAttribute.ProcessContents.ToString());
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

        private static void HandleAttributeGroupRef(XmlSchemaAttributeGroupRef item, JsonSchemaBuilder builder)
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
                HandleType(item.SchemaTypeName, optional ? 0 : item.MinOccurs, item.MaxOccurs, array, item.IsNillable, builder);
            }
            else
            {
                var itemsBuilder = builder;
                if (item.MaxOccurs > 1)
                {
                    itemsBuilder = new JsonSchemaBuilder();
                }

                switch (item.SchemaType)
                {
                    case XmlSchemaSimpleType x:
                        HandleSimpleType(x, optional, array, itemsBuilder);
                        break;
                    case XmlSchemaComplexType x:
                        HandleComplexType(x, optional, array, item.IsNillable, itemsBuilder);
                        break;
                }

                if (item.MaxOccurs > 1)
                {
                    if (item.IsNillable)
                    {
                        builder.Type(SchemaValueType.Array, SchemaValueType.Null);
                    }
                    else
                    {
                        builder.Type(SchemaValueType.Array);
                    }

                    if (item.MinOccurs != 0)
                    {
                        builder.MinItems((uint)item.MinOccurs);
                    }

                    if (item.MaxOccursString != "unbounded")
                    {
                        builder.MaxItems((uint)item.MaxOccurs);
                    }

                    builder.Items(itemsBuilder);
                }
            }

            AddUnhandledAttributes(item, builder);
            CarryOccursProperties(item, builder);

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

        private static JsonSchemaBuilder ConvertSchemaGroupRef(XmlSchemaGroupRef item)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleGroupRef(item, builder);

            return builder;
        }

        private JsonSchemaBuilder ConvertSchemaSimpleType(XmlSchemaSimpleType item, bool optional, bool array)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleSimpleType(item, optional, array, builder);
            AddUnhandledAttributes(item, builder);
            return builder;
        }

        private JsonSchemaBuilder ConvertSchemaComplexType(XmlSchemaComplexType item, bool optional, bool array)
        {
            JsonSchemaBuilder builder = new JsonSchemaBuilder();

            HandleComplexType(item, optional, array, false, builder);

            return builder;
        }

        private static void HandleAnnotation(XmlSchemaAnnotated item, JsonSchemaBuilder builder)
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

            return $"#/$defs/{name}";
        }

        private static void HandleType(XmlQualifiedName typeName, decimal minOccurs, decimal maxOccurs, bool array, bool nillable, JsonSchemaBuilder builder)
        {
            array = array || maxOccurs > 1;

            if (!array)
            {
                TryBuildType(typeName, nillable, builder);
                return;
            }

            var itemsBuilder = new JsonSchemaBuilder();
            if (!TryBuildType(typeName, nillable, itemsBuilder))
            {
                return;
            }

            if (minOccurs > 0)
            {
                builder.MinItems((uint)minOccurs);
            }

            if (maxOccurs is > 1 and < decimal.MaxValue)
            {
                builder.MaxItems((uint)maxOccurs);
            }

            builder.Type(SchemaValueType.Array);
            builder.Items(itemsBuilder);
        }

        private static bool TryBuildType(XmlQualifiedName typeName, bool nillable, JsonSchemaBuilder typeBuilder)
        {
            if (!GetTypeAndFormat(typeName, out SchemaValueType? type, out Format format, out string xsdType))
            {
                return false;
            }

            if (xsdType != null)
            {
                typeBuilder.XsdType(xsdType);
            }

            if (type != null)
            {
                typeBuilder.Type(type.Value, nillable);
            }
            else
            {
                BuildReference(typeBuilder, typeName, nillable);
            }

            if (format != null)
            {
                typeBuilder.Format(format);
            }

            return true;
        }

        /// <summary>
        /// If nillable it builds reference using allOf composition with type and ref keywords.
        /// </summary>
        private static void BuildReference(JsonSchemaBuilder typeBuilder, XmlQualifiedName typeName, bool nillable)
        {
            typeBuilder.Ref(GetReferenceFromTypename(typeName));
            if (nillable)
            {
                typeBuilder.XsdNillable(true);
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
                    case XmlSchemaTypes.Boolean:
                        type = SchemaValueType.Boolean;
                        format = null;
                        return true;

                    case XmlSchemaTypes.Integer:
                    case XmlSchemaTypes.NonPositiveInteger:
                    case XmlSchemaTypes.NegativeInteger:
                    case XmlSchemaTypes.NonNegativeInteger:
                    case XmlSchemaTypes.PositiveInteger:
                    case XmlSchemaTypes.Long:
                    case XmlSchemaTypes.Int:
                    case XmlSchemaTypes.Short:
                    case XmlSchemaTypes.Byte:
                    case XmlSchemaTypes.UnsignedLong:
                    case XmlSchemaTypes.UnsignedInt:
                    case XmlSchemaTypes.UnsignedShort:
                    case XmlSchemaTypes.UnsignedByte:
                        type = SchemaValueType.Integer;
                        format = null;
                        return true;

                    case XmlSchemaTypes.AnyAtomicType:
                    case XmlSchemaTypes.AnySimpleType:
                    case XmlSchemaTypes.String:
                    case XmlSchemaTypes.GMonthDay:
                    case XmlSchemaTypes.GDay:
                    case XmlSchemaTypes.GMonth:
                    case XmlSchemaTypes.HexBinary:
                    case XmlSchemaTypes.Base64Binary:
                    case XmlSchemaTypes.QName:
                    case XmlSchemaTypes.Notation:
                    case XmlSchemaTypes.NormalizedString:
                    case XmlSchemaTypes.Token:
                    case XmlSchemaTypes.Language:
                    case XmlSchemaTypes.NmToken:
                    case XmlSchemaTypes.Name:
                    case XmlSchemaTypes.NcName:
                    case XmlSchemaTypes.Id:
                    case XmlSchemaTypes.Idref:
                    case XmlSchemaTypes.Entity:
                    case XmlSchemaTypes.YearMonthDuration:
                    case XmlSchemaTypes.DayTimeDuration:
                        type = SchemaValueType.String;
                        format = null;
                        return true;

                    case XmlSchemaTypes.GYearMonth:
                        type = SchemaValueType.String;
                        format = CustomFormats.YearMonth;
                        return true;
                    case XmlSchemaTypes.GYear:
                        type = SchemaValueType.String;
                        format = CustomFormats.Year;
                        return true;
                    case XmlSchemaTypes.DateTime:
                        type = SchemaValueType.String;
                        format = Formats.DateTime;
                        return true;
                    case XmlSchemaTypes.Time:
                        type = SchemaValueType.String;
                        format = Formats.Time;
                        return true;
                    case XmlSchemaTypes.Date:
                        type = SchemaValueType.String;
                        format = Formats.Date;
                        return true;
                    case XmlSchemaTypes.Duration:
                        type = SchemaValueType.String;
                        format = Formats.Duration;
                        return true;
                    case XmlSchemaTypes.AnyUri:
                        type = SchemaValueType.String;
                        format = Formats.Uri;
                        return true;

                    case XmlSchemaTypes.Decimal:
                    case XmlSchemaTypes.Float:
                    case XmlSchemaTypes.Double:
                        type = SchemaValueType.Number;
                        format = null;
                        return true;

                    default:
                        throw new ArgumentOutOfRangeException($"The provided typename {typename} could not be mapped to any SchemaValueType.");
                }
            }

            type = null;
            format = null;
            xsdType = null;
            return true;
        }

        private static bool TryParseDecimal(string facetValue, out decimal dLength)
        {
            if (string.IsNullOrWhiteSpace(facetValue))
            {
                dLength = 0;
                return false;
            }

            /*
             * The XML schema spec specifies that floating point numbers are represented using a period and
             * not using a comma. The locale doesn't have any affect on what is valid XML.
             *
             * Default behaviour of TryParse is to use CurrentCulture. This must be overridden.
             *
             * We assumed that XSD do not allow the use of group separators. This is why we have not
             * made a similar override for parsing of whole numbers like integer.
             */

            return decimal.TryParse(facetValue, NumberStyles.Float, CultureInfo.InvariantCulture, out dLength);
        }

        private static void CarryOccursProperties(XmlSchemaParticle item, JsonSchemaBuilder builder)
        {
            if (!string.IsNullOrWhiteSpace(item.MinOccursString))
            {
                builder.XsdMinOccurs((int)item.MinOccurs);
            }

            if (!string.IsNullOrWhiteSpace(item.MaxOccursString))
            {
                builder.XsdMaxOccurs(item.MaxOccursString);
            }
        }
    }
}
