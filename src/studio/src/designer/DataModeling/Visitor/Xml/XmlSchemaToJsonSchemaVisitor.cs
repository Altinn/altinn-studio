using System;
using System.Buffers;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.More;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Xml
{
    /// <summary>
    /// Visitor class for converting XML schema to Json Schema, this will produce a Json Schema with custom keywords to preserve XML schema information
    /// </summary>
    public class XmlSchemaToJsonSchemaVisitor : XmlSchemaVisitorBase
    {
        private static readonly Dictionary<string, int> Unhandled = new Dictionary<string, int>();
        private int _unhandledCount;

        private const string XmlSchemaNamespace = "http://www.w3.org/2001/XMLSchema";

        private readonly XmlStructure _structure = new XmlStructure();

        private readonly Stack<BuilderContext> _contextStack = new Stack<BuilderContext>();
        private readonly Stack<ScopeContext> _scopeContextStack = new Stack<ScopeContext>();

        private JsonSchemaBuilder Builder => _contextStack.Peek().Builder;

        private List<IJsonSchemaKeyword> AdditionalKeywords => _contextStack.Peek().AdditionalKeywords;

        private List<string> Metadata => _contextStack.Peek().Metadata;

        private List<SchemaDefinition> Definitions => _contextStack.Peek().Definitions;

        private List<JsonSchema> Refs => _contextStack.Peek().Refs;

        private bool OptionalScope
        {
            get { return _scopeContextStack.Any(context => context.OptionalScope); }
            set => _scopeContextStack.Peek().OptionalScope = value;
        }

        private bool ArrayScope
        {
            get { return _scopeContextStack.Any(context => context.ArrayScope); }
            set => _scopeContextStack.Peek().ArrayScope = value;
        }

        /// <summary>
        /// Get the generated Json Schema, if the visitor has not been run it will return an open Json Schema <code>{ true }</code>
        /// </summary>
        public JsonSchema Schema
        {
            get
            {
                Console.Write(_unhandledCount == 0 ? '.' : 'x');
                return _contextStack.Count == 0 ? JsonSchema.True : Builder;
            }
        }

        /// <summary>
        /// Returns the current schema as Json string
        /// </summary>
        /// <returns>Json string representation of the current schema</returns>
        [ExcludeFromCodeCoverage]
        public string GetSchemaString()
        {
            return JsonSerializer.Serialize(Schema, new JsonSerializerOptions { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping, WriteIndented = true });
        }

        /// <summary>
        /// Utility method for finding unhandled nodes
        /// </summary>
        [ExcludeFromCodeCoverage]
        public static void PrintUnhandledStats()
        {
            foreach ((string key, int value) in Unhandled.OrderByDescending(kvp => kvp.Value))
            {
                Console.WriteLine($"{key} {value}");
            }
        }

        [ExcludeFromCodeCoverage]
        private void AddUnhandled([CallerMemberName] string name = null)
        {
            _unhandledCount++;
            if (!Unhandled.TryGetValue(name!, out int value))
            {
                value = 0;
                Unhandled.Add(name, value);
            }

            Unhandled[name] = value + 1;
        }

        /// <inheritdoc />
        public override void VisitSchemaNode(XmlSchema schema)
        {
            _contextStack.Clear();
            _unhandledCount = 0;

            _structure.Push("Schema");
            PushBuilder();

            Builder
               .Schema(MetaSchemas.Draft201909Id)
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

            foreach (XmlSchemaObject item in schema.Items.Cast<XmlSchemaObject>())
            {
                switch (item)
                {
                    case XmlSchemaImport:
                        throw new NotImplementedException("Schema imports are not supported by Altinn Studio");
                    case XmlSchemaRedefine:
                        throw new NotImplementedException("Redefine is not supported by Altinn Studio");
                    case XmlSchemaAnnotation:
                    case XmlSchemaSimpleType:
                    case XmlSchemaComplexType:
                    case XmlSchemaGroup:
                    case XmlSchemaElement:
                    case XmlSchemaAttribute:
                    case XmlSchemaAttributeGroup:
                        item.Accept(this);
                        break;
                    default:
                        throw new XmlSchemaException("Unsupported global element in xml schema", null, item.LineNumber, item.LinePosition);
                }
            }

            if (Definitions.Count > 0)
            {
                Builder.Properties(Definitions.Take(1).Select(def => (def.Name, def.Schema)).ToArray());
            }

            if (Definitions.Count > 1)
            {
                Builder.Definitions(Definitions.Skip(1).Select(def => (def.Name, def.Schema)).ToArray());
            }
        }

        /// <inheritdoc />
        public override void VisitSchemaAnnotation(XmlSchemaAnnotation item)
        {
            if (item.Parent is XmlSchema)
            {
                VisitSchemaRootAnnotation(item);
                return;
            }

            XmlSchemaAppInfo appInfo = item.Items.Cast<XmlSchemaObject>().FirstOrDefault(o => o is XmlSchemaAppInfo) as XmlSchemaAppInfo;
            XmlSchemaDocumentation doc = item.Items.Cast<XmlSchemaObject>().FirstOrDefault(o => o is XmlSchemaDocumentation) as XmlSchemaDocumentation;

            if (appInfo?.Markup != null && appInfo.Markup.Length > 0)
            {
                XmlDocument xml = new XmlDocument();
                XmlElement root = xml.CreateElement("root");
                xml.AppendChild(root);
                foreach (XmlNode node in appInfo.Markup)
                {
                    root.AppendChild(xml.ImportNode(node!, true));
                }

                Builder.Comment(root.InnerXml);
            }

            if (doc?.Markup != null && doc.Markup.Length > 0)
            {
                XmlDocument xml = new XmlDocument();
                XmlElement root = xml.CreateElement("root");
                xml.AppendChild(root);
                foreach (XmlNode node in doc.Markup)
                {
                    root.AppendChild(xml.ImportNode(node!, true));
                }

                Builder.Description(root.InnerXml);
            }
        }

        /// <summary>
        /// Specifically for handling SERES schema annotation
        /// </summary>
        private void VisitSchemaRootAnnotation(XmlSchemaAnnotation item)
        {
            XmlSchemaDocumentation documentation = (XmlSchemaDocumentation)item.Items
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

            Builder.Info(info.RootElement);
        }

        /// <inheritdoc />
        public override void VisitSchemaAttribute(XmlSchemaAttribute item)
        {
            _structure.Push("Attribute");

            PushBuilder();

            item.Annotation?.Accept(this);

            string name = item.Name;

            if (!item.RefName.IsEmpty)
            {
                name = item.RefName.Name;
                Builder.Ref(GetReferenceFromTypename(item.RefName));
                Builder.XsdType("#ref");
            }
            else if (!item.SchemaTypeName.IsEmpty)
            {
                HandleType(item.SchemaTypeName, item.Use == XmlSchemaUse.Optional ? 0 : 1, 1);
            }
            else
            {
                item.SchemaType?.Accept(this);
            }

            if (item.DefaultValue != null)
            {
                Builder.Default(item.DefaultValue.AsJsonElement());
            }

            if (item.FixedValue != null)
            {
                Builder.Const(item.FixedValue.AsJsonElement());
            }

            if (name == null)
            {
                throw new XmlSchemaException("Unnamed attribute not expected", null, item.LineNumber, item.LinePosition);
            }

            AddUnhandledAttributes(item);
            Builder.XsdStructure(_structure.Current);
            _structure.Pop();
            JsonSchema schema = PopBuilder();
            Definitions.Add(name, schema, item.Use == XmlSchemaUse.Required, OptionalScope, ArrayScope);
        }

        /// <inheritdoc />
        public override void VisitSchemaAttributeGroup(XmlSchemaAttributeGroup item)
        {
            _structure.Push("AttributeGroup");

            if (item.Name != null)
            {
                PushBuilder();
            }

            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            if (item.Name != null)
            {
                item.Annotation?.Accept(this);
                AddDefinitions();
                AddUnhandledAttributes(item);
                Builder.XsdStructure(_structure.Current);
                JsonSchema schema = PopBuilder();
                Definitions.Add(item.Name, schema, true, OptionalScope, ArrayScope);
            }

            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaAttributeGroupRef(XmlSchemaAttributeGroupRef item)
        {
            _structure.Push("AttributeGroupRef");

            Refs.Add(new JsonSchemaBuilder()
                        .Ref(GetReferenceFromTypename(item.RefName))
                        .XsdStructure(_structure.Current));

            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaElement(XmlSchemaElement item)
        {
            _structure.Push("Element");
            PushBuilder();

            item.Annotation?.Accept(this);

            string name = item.Name;
            
            if (!item.RefName.IsEmpty)
            {
                name = item.RefName.Name;
                Builder.Ref(GetReferenceFromTypename(item.RefName));
                Builder.XsdType("#ref");
            }

            HandleType(item.SchemaTypeName, item.MinOccurs, item.MaxOccurs);

            item.SchemaType?.Accept(this);

            if (name == null)
            {
                throw new XmlSchemaException("Unnamed element not expected", null, item.LineNumber, item.LinePosition);
            }

            AddDefinitions();
            AddUnhandledAttributes(item);
            Builder.XsdStructure(_structure.Current);
            JsonSchema schema = PopBuilder();
            _structure.Pop();

            Definitions.Add(name, schema, item.MinOccurs > 0, OptionalScope, ArrayScope);
        }

        /// <inheritdoc />
        public override void VisitSchemaChoice(XmlSchemaChoice item)
        {
            _structure.Push("Choice");

            if (item.MaxOccurs > 1)
            {
                PushBuilder();
            }
            else if (item.MinOccurs == 0)
            {
                PushScope();
                OptionalScope = true;
            }

            List<JsonSchema> choices = new List<JsonSchema>();

            foreach (XmlSchemaObject choice in item.Items)
            {
                PushBuilder();
                choice.Accept(this);
                AddDefinitions();
                choices.Add(PopBuilder());
            }

            Builder.OneOf(choices);

            if (item.MaxOccurs > 1)
            {
                JsonSchema schema = PopBuilder();
                Builder.Type(SchemaValueType.Array);
                Builder.Items(schema);

                if (item.MaxOccurs < decimal.MaxValue)
                {
                    Builder.MaxItems((uint)item.MaxOccurs);
                }

                if (item.MinOccurs > 0)
                {
                    Builder.MinItems((uint)item.MinOccurs);
                }
            }
            
            AddUnhandledAttributes(item);

            if (item.MaxOccurs == 1 && item.MinOccurs == 0)
            {
                PopScope();
            }

            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaAll(XmlSchemaAll item)
        {
            _structure.Push("All");
            PushScope();

            if (item.MinOccurs == 0)
            {
                OptionalScope = true;
            }

            if (item.MaxOccurs > 1)
            {
                ArrayScope = true;
            }

            foreach (XmlSchemaObject choice in item.Items)
            {
                choice.Accept(this);
            }

            AddDefinitions();
            AddUnhandledAttributes(item);

            PopScope();
            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaSequence(XmlSchemaSequence item)
        {
            _structure.Push("Sequence");
            PushScope();

            if (item.MinOccurs == 0)
            {
                OptionalScope = true;
            }

            if (item.MaxOccurs > 1)
            {
                ArrayScope = true;
            }

            bool hasNonElementItems = item
               .Items
               .OfType<XmlSchemaObject>()
               .Any(obj => !(obj is XmlSchemaElement || obj is XmlSchemaAny));

            if (hasNonElementItems)
            {
                List<JsonSchema> schemas = new List<JsonSchema>();

                // PushBuilder();

                for (int i = 0; i < item.Items.Count; i++)
                {
                    XmlSchemaObject child = item.Items[i];
                    bool complexChild = !(child is XmlSchemaElement || child is XmlSchemaAny);

                    if (complexChild)
                    {
                        PushBuilder();
                        child.Accept(this);
                        AddDefinitions();
                        schemas.Add(PopBuilder());
                    }
                    else
                    {
                        PushBuilder();
                        for (; i < item.Items.Count; i++)
                        {
                            child = item.Items[i];
                            complexChild = !(child is XmlSchemaElement || child is XmlSchemaAny);
                            if (complexChild)
                            {
                                i--;
                                break;
                            }

                            child.Accept(this);
                        }

                        AddDefinitions();
                        schemas.Add(PopBuilder());
                    }
                }

                //AddDefinitions();
                //schemas.Add(PopBuilder());

                // foreach (XmlSchemaObject child in item.Items)
                // {
                //     if (!firstChild && !(child is XmlSchemaElement || child is XmlSchemaAny))
                //     {
                //         AddDefinitions();
                //         schemas.Add(PopBuilder());
                //         PushBuilder();
                //     }
                //
                //     child.Accept(this);
                //
                //     firstChild = false;
                // }
                Builder.AllOf(schemas);
            }
            else
            {
                foreach (XmlSchemaObject child in item.Items)
                {
                    child.Accept(this);
                }

                AddDefinitions();
            }

            AddUnhandledAttributes(item);

            PopScope();
            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaGroup(XmlSchemaGroup item)
        {
            _structure.Push("Group");

            if (item.Name != null)
            {
                PushBuilder();
            }

            item.Particle?.Accept(this);

            if (item.Name != null)
            {
                item.Annotation?.Accept(this);
                AddUnhandledAttributes(item);
                Builder.XsdStructure(_structure.Current);
                JsonSchema schema = PopBuilder();
                Definitions.Add(item.Name, schema, true, OptionalScope, ArrayScope);
            }

            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaGroupRef(XmlSchemaGroupRef item)
        {
            _structure.Push("GroupRef");
            PushBuilder();

            Builder.Ref(GetReferenceFromTypename(item.RefName));
            item.Particle?.Accept(this);
            Builder.XsdStructure(_structure.Current);

            JsonSchema schema = PopBuilder();
            Refs.Add(schema);

            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaSimpleType(XmlSchemaSimpleType item)
        {
            _structure.Push("SimpleType");
            if (item.Name != null)
            {
                PushBuilder();
            }

            item.Content.Accept(this);

            if (item.Name != null)
            {
                item.Annotation?.Accept(this);
                AddUnhandledAttributes(item);
                Builder.XsdStructure(_structure.Current);
                JsonSchema schema = PopBuilder();
                Definitions.Add(item.Name, schema, true, OptionalScope, ArrayScope);
            }

            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaSimpleTypeList(XmlSchemaSimpleTypeList item)
        {
            _structure.Push("List");
            HandleType(item.ItemTypeName, 0, decimal.MaxValue);
            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaSimpleTypeRestriction(XmlSchemaSimpleTypeRestriction item)
        {
            _structure.Push("Restriction");

            item.BaseType?.Accept(this);
            if (!item.BaseTypeName.IsEmpty)
            { 
                HandleType(item.BaseTypeName, 1, 1);
            }

            foreach (XmlSchemaFacet facet in item.Facets.Cast<XmlSchemaFacet>())
            {
                HandleRestrictionFacet(facet);
            }

            FinalizeRestrictionFacets();

            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaSimpleTypeUnion(XmlSchemaSimpleTypeUnion item)
        {
            AddUnhandled();
        }

        /// <inheritdoc />
        public override void VisitSchemaComplexType(XmlSchemaComplexType item)
        {
            _structure.Push("ComplexType");

            if (item.Name != null)
            {
                PushBuilder();
            }

            item.Particle?.Accept(this);
            item.ContentModel?.Accept(this);
            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            item.AnyAttribute?.Accept(this);

            if (item.Name != null)
            {
                item.Annotation?.Accept(this);
                AddDefinitions();
                AddUnhandledAttributes(item);
                Builder.XsdStructure(_structure.Current);
                JsonSchema schema = PopBuilder();
                Definitions.Add(item.Name, schema, true, OptionalScope, ArrayScope);
            }

            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaSimpleContent(XmlSchemaSimpleContent item)
        {
            _structure.Push("SimpleContent");
            item.Content.Accept(this);
            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaComplexContent(XmlSchemaComplexContent item)
        {
            _structure.Push("ComplexContent");
            item.Content?.Accept(this);
            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaSimpleContentExtension(XmlSchemaSimpleContentExtension item)
        {
            _structure.Push("Extension");
            PushBuilder();

            item.Annotation?.Accept(this);
            HandleType(item.BaseTypeName, 1, 1);
            AddUnhandledAttributes(item);
            JsonSchema schema = PopBuilder();
            Definitions.Add("value", schema, true, OptionalScope, ArrayScope);

            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            Builder.XsdStructure(_structure.Current);
            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaSimpleContentRestriction(XmlSchemaSimpleContentRestriction item)
        {
            _structure.Push("Restriction");

            PushBuilder();
            item.Annotation?.Accept(this);

            PushBuilder();
            HandleType(item.BaseTypeName, 1, 1);
            JsonSchema baseType = PopBuilder();

            PushBuilder();
            foreach (XmlSchemaFacet facet in item.Facets.Cast<XmlSchemaFacet>())
            {
                HandleRestrictionFacet(facet);
            }

            FinalizeRestrictionFacets();
            AddUnhandledAttributes(item);
            JsonSchema restrictions = PopBuilder();

            Builder.AllOf(baseType, restrictions);

            Builder.XsdStructure(_structure.Current);
            JsonSchema schema = PopBuilder();
            Definitions.Add("value", schema, true, OptionalScope, ArrayScope);

            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            Builder.XsdStructure(_structure.Current);
            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaComplexContentExtension(XmlSchemaComplexContentExtension item)
        {
            _structure.Push("Extension");

            PushBuilder();
            HandleType(item.BaseTypeName, 1, 1);
            JsonSchema baseType = PopBuilder();

            PushBuilder();
            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            item.Particle?.Accept(this);
            JsonSchema extensionContent = PopBuilder();

            Builder.AllOf(baseType, extensionContent);

            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaComplexContentRestriction(XmlSchemaComplexContentRestriction item)
        {
            _structure.Push("Restriction");

            PushBuilder();
            HandleType(item.BaseTypeName, 1, 1);
            JsonSchema baseType = PopBuilder();

            PushBuilder();
            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            item.Particle?.Accept(this);
            JsonSchema restrictionContent = PopBuilder();

            Builder.AllOf(baseType, restrictionContent);

            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaAny(XmlSchemaAny item)
        {
            XsdAnyKeyword keyword = AdditionalKeywords.SingleOrDefault(kw => kw is XsdAnyKeyword) as XsdAnyKeyword;
            if (keyword == null)
            {
                keyword = new XsdAnyKeyword(Enumerable.Empty<string>());
                AdditionalKeywords.Add(keyword);
            }

            _structure.Push("Any");
            keyword.Value.Add(_structure.Current.GetPath());
            _structure.Pop();
        }

        /// <inheritdoc />
        public override void VisitSchemaAnyAttribute(XmlSchemaAnyAttribute item)
        {
            Builder.XsdAnyAttribute();
        }

        private void PushBuilder()
        {
            _contextStack.Push(new BuilderContext());
        }

        private JsonSchema PopBuilder()
        {
            BuilderContext context = _contextStack.Pop();
            foreach (IJsonSchemaKeyword keyword in context.AdditionalKeywords)
            {
                context.Builder.Add(keyword);
            }

            return context.Builder;
        }

        private void PushScope()
        {
            _scopeContextStack.Push(new ScopeContext());
        }

        private void PopScope()
        {
            _scopeContextStack.Pop();
        }

        private void AddDefinitions()
        {
            JsonSchemaBuilder builder = Refs.Count > 0 ? new JsonSchemaBuilder() : Builder;

            if (Definitions.Count > 0)
            {
                builder.Type(SchemaValueType.Object);
                builder.Properties(Definitions.Select(def => (def.Name, def.Schema)).ToArray());
                List<string> required = Definitions
                   .Where(def => def.IsRequired)
                   .Select(def => def.Name)
                   .ToList();
                if (required.Count > 0)
                {
                    builder.Required(required);
                }
            }

            if (Refs.Count > 0)
            {
                List<JsonSchema> schemas = new List<JsonSchema>(Refs);
                if (Definitions.Count > 0)
                {
                    schemas.Add(builder);
                }

                Builder.AllOf(schemas);
            }
        }

        private void AddUnhandledAttributes(XmlSchemaAnnotated item)
        {
            if (item.UnhandledAttributes != null && item.UnhandledAttributes.Length > 0)
            {
                IEnumerable<(string Name, string Value)> unhandledAttributes = item.UnhandledAttributes.Select(attr => (attr.Name, attr.Value));
                Builder.XsdUnhandledAttributes(unhandledAttributes);
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

        private void HandleType(XmlQualifiedName typeName, decimal minOccurs, decimal maxOccurs)
        {
            if (ArrayScope && maxOccurs <= 1)
            {
                maxOccurs = decimal.MaxValue;
                if (OptionalScope)
                {
                    minOccurs = 0;
                }
            }

            if (GetTypeAndFormat(typeName, out SchemaValueType? type, out Format format, out string xsdType))
            {
                if (maxOccurs > 1)
                {
                    PushBuilder();
                }

                if (type != null)
                {
                    Builder.Type(type.Value);
                }
                else
                {
                    Builder.Ref(GetReferenceFromTypename(typeName));
                }

                if (format != null)
                {
                    Builder.Format(format);
                }

                if (maxOccurs > 1)
                {
                    if (minOccurs > 0)
                    {
                        Builder.MinItems((uint)minOccurs);
                    }

                    if (maxOccurs < decimal.MaxValue)
                    {
                        Builder.MaxItems((uint)maxOccurs);
                    }

                    JsonSchema itemsSchema = PopBuilder();
                    Builder.Type(SchemaValueType.Array);
                    Builder.Items(itemsSchema);
                }

                if (xsdType != null)
                {
                    Builder.XsdType(xsdType);
                }
            }
        }

        private void HandleRestrictionFacet(XmlSchemaFacet facet)
        {
            decimal dLength;
            uint uiLength;

            string xsdRestriction = facet.GetType().Name;
            xsdRestriction = xsdRestriction[9..^5];
            xsdRestriction = char.ToLowerInvariant(xsdRestriction[0]) + xsdRestriction[1..];
            Metadata.Add($"xsdRestriction:{xsdRestriction}:{facet.Value}");

            switch (facet)
            {
                case XmlSchemaEnumerationFacet:
                    Metadata.Add($"enum:{facet.Value}");
                    break;
                case XmlSchemaFractionDigitsFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && uint.TryParse(facet.Value, out uiLength))
                    {
                        Builder.MultipleOf(1m / (decimal)Math.Pow(10, uiLength));
                    }

                    break;
                case XmlSchemaLengthFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && uint.TryParse(facet.Value, out uiLength))
                    {
                        Builder.MaxLength(uiLength);
                        Builder.MinLength(uiLength);
                    }

                    break;
                case XmlSchemaMaxExclusiveFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && decimal.TryParse(facet.Value, out dLength))
                    {
                        Builder.ExclusiveMaximum(dLength);
                    }

                    break;
                case XmlSchemaMaxInclusiveFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && decimal.TryParse(facet.Value, out dLength))
                    {
                        Builder.Maximum(dLength);
                    }

                    break;
                case XmlSchemaMaxLengthFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && uint.TryParse(facet.Value, out uiLength))
                    {
                        Builder.MaxLength(uiLength);
                    }

                    break;
                case XmlSchemaMinExclusiveFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && decimal.TryParse(facet.Value, out dLength))
                    {
                        Builder.ExclusiveMinimum(dLength);
                    }

                    break;
                case XmlSchemaMinInclusiveFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && decimal.TryParse(facet.Value, out dLength))
                    {
                        Builder.Minimum(dLength);
                    }

                    break;
                case XmlSchemaMinLengthFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && uint.TryParse(facet.Value, out uiLength))
                    {
                        Builder.MinLength(uiLength);
                    }

                    break;
                case XmlSchemaTotalDigitsFacet:
                    if (!string.IsNullOrWhiteSpace(facet.Value) && uint.TryParse(facet.Value, out uiLength))
                    {
                        Builder.MaxLength(uiLength);
                    }

                    break;
                case XmlSchemaPatternFacet:
                    string pattern = facet.Value;
                    Builder.Pattern(pattern ?? throw new NullReferenceException("value of the pattern facet cannot be null"));
                    break;
                case XmlSchemaWhiteSpaceFacet:
                    break;
                default:
                    throw new ArgumentOutOfRangeException(facet.GetType().Name);
            }
        }

        private void FinalizeRestrictionFacets()
        {
            List<JsonElement> enumValues = Metadata
               .Where(md => md.StartsWith("enum:"))
               .Select(md => md[5..].AsJsonElement())
               .ToList();

            if (enumValues.Any())
            {
                Builder.Enum(enumValues);
            }

            List<string> xsdEnums = new List<string>();
            var xsdRestrictions = Metadata
               .Where(md => md.StartsWith("xsdRestriction"))
               .Select(md =>
                {
                    string[] parts = md.Split(new[] { ':' }, 3);
                    if (parts[1] == "enumeration")
                    {
                        xsdEnums.Add(parts[2]);
                        return (null, default);
                    }

                    return (parts[1], parts[2].AsJsonElement());
                })
               .Where(restriction => restriction.Item1 != null)
               .ToList();

            if (xsdEnums.Count > 0)
            {
                xsdRestrictions.Add(("enumeration", xsdEnums.ToJsonDocument().RootElement));
            }

            if (xsdRestrictions.Any())
            {
                Builder.XsdRestrictions(xsdRestrictions);
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

        private class ScopeContext
        {
            /// <summary>
            /// Marks this or one of the parent elements as optional
            /// </summary>
            public bool OptionalScope { get; set; }

            /// <summary>
            /// Marks this or one of the parent elements as an array
            /// </summary>
            public bool ArrayScope { get; set; }
        }

        private class BuilderContext
        {
            public JsonSchemaBuilder Builder { get; } = new JsonSchemaBuilder();

            public List<IJsonSchemaKeyword> AdditionalKeywords { get; } = new List<IJsonSchemaKeyword>();

            public List<string> Metadata { get; } = new List<string>();

            public List<SchemaDefinition> Definitions { get; } = new List<SchemaDefinition>();

            public List<JsonSchema> Refs { get; } = new List<JsonSchema>();
        }
    }
}
