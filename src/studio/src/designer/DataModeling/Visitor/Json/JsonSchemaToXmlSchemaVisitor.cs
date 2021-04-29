using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Json
{
    /// <summary>
    /// Visitor class for converting Json Schema to Xml schema, this relies on Json Schema with custom keywords from <see cref="Xml.XmlSchemaToJsonSchemaVisitor"/>
    /// to properly reproduce the original Xml schema
    /// </summary>
    public class JsonSchemaToXmlSchemaVisitor : JsonSchemaVisitorBase
    {
        private static readonly Dictionary<string, int> Unhandled = new Dictionary<string, int>();
        private int _unhandledCount;

        private const string XmlSchemaNamespace = "http://www.w3.org/2001/XMLSchema";
        private const string XmlSchemaInstanceNamespace = "http://www.w3.org/2001/XMLSchema-instance";

        private XmlSchema _schema;

        /// <summary>
        /// Get the generated Xml schema, if the visitor has not been run it will return an empty Xml schema
        /// </summary>
        public XmlSchema Schema
        {
            get
            {
                Console.Write(_unhandledCount == 0 ? '.' : 'x');
                return _schema ?? new XmlSchema();
            }
        }

        /// <summary>
        /// Creates an indented string representation of the Json schema
        /// </summary>
        public string SchemaString => ToString();

        private XmlSchemaObjectTree _xsdStructure;

        private readonly Stack<BuilderContext> _builder = new Stack<BuilderContext>();

        private XmlSchemaObjectBuilder Builder => _builder.Peek().Builder;

        private HashSet<string> Required => _builder.Peek().Required;

        private bool IsRequired(string name) => _builder.Peek().IsRequired(name);

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

        private void Reset()
        {
            _unhandledCount = 0;
            _xsdStructure = new XmlSchemaObjectTree();
        }

        /// <inheritdoc />
        public override void VisitSchema(JsonSchema schema, JsonSchema parent)
        {
            if (parent == null)
            {
                Reset();
                PushBuilder("0.Schema");
                Builder.Namespace("xsd", XmlSchemaNamespace);
                Builder.Namespace("xsi", XmlSchemaInstanceNamespace);
            }

            WorkList<IJsonSchemaKeyword> workList = schema.AsWorkList();
            XsdStructureKeyword structure = workList.Pull<XsdStructureKeyword>();

            if (structure != null)
            {
                PushBuilder(structure.Value);
            }

            workList.Pull<TypeKeyword>()?.Accept(schema, this);
            workList.Pull<RequiredKeyword>()?.Accept(schema, this);

            foreach (IJsonSchemaKeyword keyword in workList.EnumerateUnhandledItems())
            {
                keyword.Accept(schema, this);
            }

            if (structure != null)
            {
                PopBuilder();
            }

            if (parent == null)
            {
                PopBuilder();
                _schema = _xsdStructure.BuildSchema();
            }
        }

        /// <inheritdoc />
        public override void VisitAdditionalItemsKeyword(JsonSchema schema, AdditionalItemsKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitAdditionalPropertiesKeyword(JsonSchema schema, AdditionalPropertiesKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitAllOfKeyword(JsonSchema schema, AllOfKeyword item)
        {
            foreach (JsonSchema itemSchema in item.Schemas)
            {
                itemSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitAnchorKeyword(JsonSchema schema, AnchorKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitAnyOfKeyword(JsonSchema schema, AnyOfKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitCommentKeyword(JsonSchema schema, CommentKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitConstKeyword(JsonSchema schema, ConstKeyword item)
        {
            Builder.Fixed(item.Value.GetString());
        }

        /// <inheritdoc />
        public override void VisitContainsKeyword(JsonSchema schema, ContainsKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitContentMediaEncodingKeyword(JsonSchema schema, ContentMediaEncodingKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitContentMediaTypeKeyword(JsonSchema schema, ContentMediaTypeKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitContentSchemaKeyword(JsonSchema schema, ContentSchemaKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitDefaultKeyword(JsonSchema schema, DefaultKeyword item)
        {
            Builder.Default(item.Value.GetString());
        }

        /// <inheritdoc />
        public override void VisitDefinitionsKeyword(JsonSchema schema, DefinitionsKeyword item)
        {
            HandleDefinitions(schema, item.Definitions);
        }

        /// <inheritdoc />
        public override void VisitDefsKeyword(JsonSchema schema, DefsKeyword item)
        {
            HandleDefinitions(schema, item.Definitions);
        }

        private void HandleDefinitions(JsonSchema schema, IReadOnlyDictionary<string, JsonSchema> definitions)
        {
            foreach ((string name, JsonSchema definition) in definitions)
            {
                XsdStructureKeyword structure = definition.GetKeyword<XsdStructureKeyword>();
                PushBuilder(structure.Value);
                Builder.Name(name);
                definition.Accept(schema, this);
                PopBuilder();
            }
        }

        /// <inheritdoc />
        public override void VisitDependenciesKeyword(JsonSchema schema, DependenciesKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitDependentRequiredKeyword(JsonSchema schema, DependentRequiredKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitDependentSchemasKeyword(JsonSchema schema, DependentSchemasKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitDeprecatedKeyword(JsonSchema schema, DeprecatedKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitDescriptionKeyword(JsonSchema schema, DescriptionKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitDynamicAnchorKeyword(JsonSchema schema, DynamicAnchorKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitDynamicRefKeyword(JsonSchema schema, DynamicRefKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitEnumKeyword(JsonSchema schema, EnumKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitExamplesKeyword(JsonSchema schema, ExamplesKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitExclusiveMaximumKeyword(JsonSchema schema, ExclusiveMaximumKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitExclusiveMinimumKeyword(JsonSchema schema, ExclusiveMinimumKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitFormatKeyword(JsonSchema schema, FormatKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitIdKeyword(JsonSchema schema, IdKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitIfKeyword(JsonSchema schema, IfKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitElseKeyword(JsonSchema schema, ElseKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitThenKeyword(JsonSchema schema, ThenKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitItemsKeyword(JsonSchema schema, ItemsKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMaxContainsKeyword(JsonSchema schema, MaxContainsKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMaximumKeyword(JsonSchema schema, MaximumKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMaxItemsKeyword(JsonSchema schema, MaxItemsKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMaxLengthKeyword(JsonSchema schema, MaxLengthKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMaxPropertiesKeyword(JsonSchema schema, MaxPropertiesKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMinContainsKeyword(JsonSchema schema, MinContainsKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMinimumKeyword(JsonSchema schema, MinimumKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMinItemsKeyword(JsonSchema schema, MinItemsKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMinLengthKeyword(JsonSchema schema, MinLengthKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMinPropertiesKeyword(JsonSchema schema, MinPropertiesKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitMultipleOfKeyword(JsonSchema schema, MultipleOfKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitNotKeyword(JsonSchema schema, NotKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitOneOfKeyword(JsonSchema schema, OneOfKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitPatternKeyword(JsonSchema schema, PatternKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitPatternPropertiesKeyword(JsonSchema schema, PatternPropertiesKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitPrefixItemsKeyword(JsonSchema schema, PrefixItemsKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitPropertiesKeyword(JsonSchema schema, PropertiesKeyword item)
        {
            foreach ((string name, JsonSchema propertySchema) in item.Properties)
            {
                XsdStructureKeyword structure = propertySchema.GetKeyword<XsdStructureKeyword>();
                PushBuilder(structure.Value);
                Builder.Name(name);
                if (_builder.Count > 2)
                {
                    // minOccurs and use are not available at schema level
                    if (IsRequired(name))
                    {
                        Builder.Required();
                    }
                    else
                    {
                        Builder.Optional();
                    }
                }

                propertySchema.Accept(schema, this);
                PopBuilder();
            }
        }

        /// <inheritdoc />
        public override void VisitPropertyNamesKeyword(JsonSchema schema, PropertyNamesKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitReadOnlyKeyword(JsonSchema schema, ReadOnlyKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitRecursiveAnchorKeyword(JsonSchema schema, RecursiveAnchorKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitRecursiveRefKeyword(JsonSchema schema, RecursiveRefKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitRefKeyword(JsonSchema schema, RefKeyword item)
        {
            string type = item.Reference.OriginalString.Split("/").Last();
            string xsdTypeString = schema.GetKeyword<XsdTypeKeyword>()?.Value;

            if (xsdTypeString == "#ref")
            {
                Builder.Ref(type);
            }
            else
            {
                Builder.Type(type);
            }
        }

        /// <inheritdoc />
        public override void VisitRequiredKeyword(JsonSchema schema, RequiredKeyword item)
        {
            foreach (string property in item.Properties)
            {
                Required.Add(property);
            }
        }

        /// <inheritdoc />
        public override void VisitSchemaKeyword(JsonSchema schema, SchemaKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitTitleKeyword(JsonSchema schema, TitleKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitTypeKeyword(JsonSchema schema, TypeKeyword item)
        {
            bool popBuilder = true;

            _builder.Peek().InheritRequired = item.Type != SchemaValueType.Object;

            if (Builder.SchemaObjectType == typeof(XmlSchemaSimpleType))
            {
                PushBuilderRelative("0.SimpleTypeRestriction");
                _builder.Peek().InheritRequired = item.Type != SchemaValueType.Object;
            }
            else if (Builder.SchemaObjectType == typeof(XmlSchemaSimpleContent))
            {
                PushBuilderRelative("0.SimpleContentRestriction");
                _builder.Peek().InheritRequired = item.Type != SchemaValueType.Object;
            }
            else
            {
                popBuilder = false;
            }

            XsdTypeKeyword xsdType = schema.GetKeyword<XsdTypeKeyword>();
            if (xsdType != null)
            {
                string typeString = xsdType.Value;
                if (typeString != "#ref")
                {
                    Builder.Type(typeString, XmlSchemaNamespace);
                }
            }

            switch (item.Type)
            {
                case SchemaValueType.Object:
                    break;
                case SchemaValueType.Array:
                    break;
                case SchemaValueType.Boolean:
                    break;
                case SchemaValueType.String:
                    break;
                case SchemaValueType.Number:
                    break;
                case SchemaValueType.Integer:
                    break;
                case SchemaValueType.Null:
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(item), "Invalid type on item");
            }

            if (popBuilder)
            {
                PopBuilder();
            }
        }

        /// <inheritdoc />
        public override void VisitUnevaluatedItemsKeyword(JsonSchema schema, UnevaluatedItemsKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitUnevaluatedPropertiesKeyword(JsonSchema schema, UnevaluatedPropertiesKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitUniqueItemsKeyword(JsonSchema schema, UniqueItemsKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitVocabularyKeyword(JsonSchema schema, VocabularyKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitWriteOnlyKeyword(JsonSchema schema, WriteOnlyKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitInfoKeyword(JsonSchema schema, InfoKeyword item)
        {
            XmlDocument document = new XmlDocument();
            List<XmlNode> attributes = new List<XmlNode>();
            foreach (JsonProperty property in item.Value.EnumerateObject())
            {
                XmlElement attributeElement = document.CreateElement("xsd", "attribute", XmlSchemaNamespace);
                attributeElement.SetAttribute("name", property.Name);
                attributeElement.SetAttribute("fixed", property.Value.GetString() ?? string.Empty);
                
                attributes.Add(attributeElement);
            }

            XmlSchemaAnnotation annotation = new XmlSchemaAnnotation();
            annotation.Items.Add(new XmlSchemaDocumentation
            {
                Markup = attributes.ToArray()
            });

            Builder.Annotation(annotation);
        }

        /// <inheritdoc />
        public override void VisitXsdAnyAttributeKeyword(JsonSchema schema, XsdAnyAttributeKeyword item)
        {
            Builder.AnyAttribute();
        }

        /// <inheritdoc />
        public override void VisitXsdAnyKeyword(JsonSchema schema, XsdAnyKeyword item)
        {
            foreach (string path in item.Value)
            {
                _xsdStructure.GetFromPath(path);
            }
        }

        /// <inheritdoc />
        public override void VisitXsdAttributeKeyword(JsonSchema schema, XsdAttributeKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitXsdRestrictionsKeyword(JsonSchema schema, XsdRestrictionsKeyword item)
        {
            if (Builder.SchemaObjectType == typeof(XmlSchemaSimpleType))
            {
                PushBuilderRelative("0.SimpleTypeRestriction");
            }
            else if (Builder.SchemaObjectType == typeof(XmlSchemaSimpleContent))
            {
                PushBuilderRelative("0.SimpleContentRestriction");
            }
            else if (Builder.SchemaObjectType == typeof(XmlSchemaAttribute))
            {
                PushBuilderRelative("0.SimpleType/0.SimpleTypeRestriction");
            }
            else if (Builder.SchemaObjectType == typeof(XmlSchemaElement))
            {
                PushBuilderRelative("0.SimpleType/0.SimpleTypeRestriction");
            }
            else
            {
                throw new InvalidOperationException("Restrictions must be child of SimpleType or SimpleContent");
            }

            foreach ((string name, JsonElement value) in item.Restrictions)
            {
                if (name == "enumeration")
                {
                    Builder.Enumeration(value.EnumerateArray().Select(x => x.GetString()));
                }
                else
                {
                    Builder.Restriction(name, value.GetString());
                }
            }

            PopBuilder();
        }

        /// <inheritdoc />
        public override void VisitXsdStructureKeyword(JsonSchema schema, XsdStructureKeyword item)
        {
            // Handled in-place where needed
        }

        /// <inheritdoc />
        public override void VisitXsdTypeKeyword(JsonSchema schema, XsdTypeKeyword item)
        {
            // Handled in-place where needed (VisitTypeKeyword)
        }

        /// <inheritdoc />
        public override void VisitXsdSchemaAttributesKeyword(JsonSchema schema, XsdSchemaAttributesKeyword item)
        {
            foreach ((string name, string value) in item.Properties)
            {
                switch (name)
                {
                    case nameof(XmlSchema.AttributeFormDefault):
                        Builder.AttributeFormDefault(value);
                        break;
                    case nameof(XmlSchema.ElementFormDefault):
                        Builder.ElementFormDefault(value);
                        break;
                    case nameof(XmlSchema.BlockDefault):
                        Builder.BlockDefault(value);
                        break;
                    case nameof(XmlSchema.FinalDefault):
                        Builder.FinalDefault(value);
                        break;
                }
            }
        }

        /// <inheritdoc />
        public override void VisitXsdUnhandledAttributesKeyword(JsonSchema schema, XsdUnhandledAttributesKeyword item)
        {
            AddUnhandled();
            foreach (JsonSchema subSchema in item.GetSubschemas())
            {
                subSchema.Accept(schema, this);
            }
        }

        /// <inheritdoc />
        public override void VisitXsdNamespacesKeyword(JsonSchema schema, XsdNamespacesKeyword item)
        {
            foreach ((string prefix, string ns) in item.Namespaces)
            {
                Builder.Namespace(prefix, ns);
            }
        }

        /// <summary>
        /// Creates an indented string representation of the Json schema
        /// </summary>
        public override string ToString()
        {
            using MemoryStream ms = new MemoryStream();
            using XmlWriter xmlWriter = XmlWriter.Create(ms, new XmlWriterSettings
            {
                Encoding = Encoding.UTF8,
                Indent = true
            });
            _schema.Write(xmlWriter);
            return Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
        }

        private void PushBuilder(string xmlSchemaStructurePath)
        {
            _builder.Push(new BuilderContext
            {
                Parent = _builder.Count > 0 ? _builder.Peek() : null,
                XmlSchemaStructurePath = xmlSchemaStructurePath,
                Builder = _xsdStructure.GetFromPath(xmlSchemaStructurePath),
                Required = new HashSet<string>(),
                InheritRequired = true
            });
        }

        private void PushBuilderRelative(string xmlSchemaStructureRelativePath)
        {
            PushBuilder($"{_builder.Peek().XmlSchemaStructurePath}/{xmlSchemaStructureRelativePath}");
        }

        private void PopBuilder()
        {
            _builder.Pop();
        }

        private class BuilderContext
        {
            public BuilderContext Parent { get; init; }

            public string XmlSchemaStructurePath { get; init; }

            public XmlSchemaObjectBuilder Builder { get; init; }

            public HashSet<string> Required { get; init; }

            public bool InheritRequired { get; set; }

            public bool IsRequired(string name)
            {
                BuilderContext ctx = this;
                while (ctx != null)
                {
                    if (ctx.Required.Contains(name))
                    {
                        return true;
                    }

                    ctx = ctx.InheritRequired ? ctx.Parent : null;
                }

                return false;
            }
        }
    }
}
