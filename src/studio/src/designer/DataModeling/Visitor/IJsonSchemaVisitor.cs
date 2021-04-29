using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Visitor
{
    /// <summary>
    /// Visitor interface for a JsonSchema, also supports all custom keywords for Altinn Studio DataModeling
    /// </summary>
    public interface IJsonSchemaVisitor
    {
        /// <summary>
        /// Visit schema node
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="parent">The parent schema or null if this is the root schema</param>
        void VisitSchema(JsonSchema schema, JsonSchema parent);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitAdditionalItemsKeyword(JsonSchema schema, AdditionalItemsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitAdditionalPropertiesKeyword(JsonSchema schema, AdditionalPropertiesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitAllOfKeyword(JsonSchema schema, AllOfKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitAnchorKeyword(JsonSchema schema, AnchorKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitAnyOfKeyword(JsonSchema schema, AnyOfKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitCommentKeyword(JsonSchema schema, CommentKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitConstKeyword(JsonSchema schema, ConstKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitContainsKeyword(JsonSchema schema, ContainsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitContentMediaEncodingKeyword(JsonSchema schema, ContentMediaEncodingKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitContentMediaTypeKeyword(JsonSchema schema, ContentMediaTypeKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitContentSchemaKeyword(JsonSchema schema, ContentSchemaKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitDefaultKeyword(JsonSchema schema, DefaultKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitDefinitionsKeyword(JsonSchema schema, DefinitionsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitDefsKeyword(JsonSchema schema, DefsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitDependenciesKeyword(JsonSchema schema, DependenciesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitDependentRequiredKeyword(JsonSchema schema, DependentRequiredKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitDependentSchemasKeyword(JsonSchema schema, DependentSchemasKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitDeprecatedKeyword(JsonSchema schema, DeprecatedKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitDescriptionKeyword(JsonSchema schema, DescriptionKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitDynamicAnchorKeyword(JsonSchema schema, DynamicAnchorKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitDynamicRefKeyword(JsonSchema schema, DynamicRefKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitEnumKeyword(JsonSchema schema, EnumKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitExamplesKeyword(JsonSchema schema, ExamplesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitExclusiveMaximumKeyword(JsonSchema schema, ExclusiveMaximumKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitExclusiveMinimumKeyword(JsonSchema schema, ExclusiveMinimumKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitFormatKeyword(JsonSchema schema, FormatKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitIdKeyword(JsonSchema schema, IdKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitIfKeyword(JsonSchema schema, IfKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitElseKeyword(JsonSchema schema, ElseKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitThenKeyword(JsonSchema schema, ThenKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitItemsKeyword(JsonSchema schema, ItemsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMaxContainsKeyword(JsonSchema schema, MaxContainsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMaximumKeyword(JsonSchema schema, MaximumKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMaxItemsKeyword(JsonSchema schema, MaxItemsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMaxLengthKeyword(JsonSchema schema, MaxLengthKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMaxPropertiesKeyword(JsonSchema schema, MaxPropertiesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMinContainsKeyword(JsonSchema schema, MinContainsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMinimumKeyword(JsonSchema schema, MinimumKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMinItemsKeyword(JsonSchema schema, MinItemsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMinLengthKeyword(JsonSchema schema, MinLengthKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMinPropertiesKeyword(JsonSchema schema, MinPropertiesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitMultipleOfKeyword(JsonSchema schema, MultipleOfKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitNotKeyword(JsonSchema schema, NotKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitOneOfKeyword(JsonSchema schema, OneOfKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitPatternKeyword(JsonSchema schema, PatternKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitPatternPropertiesKeyword(JsonSchema schema, PatternPropertiesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitPrefixItemsKeyword(JsonSchema schema, PrefixItemsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitPropertiesKeyword(JsonSchema schema, PropertiesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitPropertyNamesKeyword(JsonSchema schema, PropertyNamesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitReadOnlyKeyword(JsonSchema schema, ReadOnlyKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitRecursiveAnchorKeyword(JsonSchema schema, RecursiveAnchorKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitRecursiveRefKeyword(JsonSchema schema, RecursiveRefKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitRefKeyword(JsonSchema schema, RefKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitRequiredKeyword(JsonSchema schema, RequiredKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitSchemaKeyword(JsonSchema schema, SchemaKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitTitleKeyword(JsonSchema schema, TitleKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitTypeKeyword(JsonSchema schema, TypeKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitUnevaluatedItemsKeyword(JsonSchema schema, UnevaluatedItemsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitUnevaluatedPropertiesKeyword(JsonSchema schema, UnevaluatedPropertiesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitUniqueItemsKeyword(JsonSchema schema, UniqueItemsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitVocabularyKeyword(JsonSchema schema, VocabularyKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitWriteOnlyKeyword(JsonSchema schema, WriteOnlyKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitInfoKeyword(JsonSchema schema, InfoKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitXsdAnyAttributeKeyword(JsonSchema schema, XsdAnyAttributeKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitXsdAnyKeyword(JsonSchema schema, XsdAnyKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitXsdAttributeKeyword(JsonSchema schema, XsdAttributeKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitXsdRestrictionsKeyword(JsonSchema schema, XsdRestrictionsKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitXsdStructureKeyword(JsonSchema schema, XsdStructureKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitXsdTypeKeyword(JsonSchema schema, XsdTypeKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitXsdSchemaAttributesKeyword(JsonSchema schema, XsdSchemaAttributesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitXsdUnhandledAttributesKeyword(JsonSchema schema, XsdUnhandledAttributesKeyword item);

        /// <summary>
        /// Visit keyword
        /// </summary>
        /// <param name="schema">The schema node</param>
        /// <param name="item">The keyword</param>
        void VisitXsdNamespacesKeyword(JsonSchema schema, XsdNamespacesKeyword item);
    }
}
