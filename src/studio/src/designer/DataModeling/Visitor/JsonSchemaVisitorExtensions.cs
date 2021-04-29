using System;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Visitor
{
    /// <summary>
    /// Extension methods for working with <see cref="JsonSchema"/> and <see cref="IJsonSchemaVisitor"/>
    /// </summary>
    public static class JsonSchemaVisitorExtensions
    {
        /// <summary>
        /// Accept a visitor on this Json Schema, this overload is used for the root schema
        /// </summary>
        /// <param name="schema">The root schema</param>
        /// <param name="visitor">The <see cref="IJsonSchemaVisitor"/> to accept</param>
        public static void Accept(this JsonSchema schema, IJsonSchemaVisitor visitor)
        {
            visitor.VisitSchema(schema, null);
        }

        /// <summary>
        /// Accept a visitor on this Json Schema, this overload is used for sub schemas
        /// </summary>
        /// <param name="schema">The schema</param>
        /// <param name="parent">The parent schema</param>
        /// <param name="visitor">The <see cref="IJsonSchemaVisitor"/> to accept</param>
        public static void Accept(this JsonSchema schema, JsonSchema parent, IJsonSchemaVisitor visitor)
        {
            visitor.VisitSchema(schema, parent);
        }

        /// <summary>
        /// Accept a visitor on this Json Schema keyword, it will call the appropriate VisitXXX on the visitor for the keyword type.
        /// </summary>
        /// <param name="keyword">The <see cref="IJsonSchemaKeyword"/></param>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="visitor">The <see cref="IJsonSchemaVisitor"/> to accept</param>
        public static void Accept(this IJsonSchemaKeyword keyword, JsonSchema schema, IJsonSchemaVisitor visitor)
        {
            switch (keyword)
            {
                case AdditionalItemsKeyword item:
                    visitor.VisitAdditionalItemsKeyword(schema, item);
                    break;
                case AdditionalPropertiesKeyword item:
                    visitor.VisitAdditionalPropertiesKeyword(schema, item);
                    break;
                case AllOfKeyword item:
                    visitor.VisitAllOfKeyword(schema, item);
                    break;
                case AnchorKeyword item:
                    visitor.VisitAnchorKeyword(schema, item);
                    break;
                case AnyOfKeyword item:
                    visitor.VisitAnyOfKeyword(schema, item);
                    break;
                case CommentKeyword item:
                    visitor.VisitCommentKeyword(schema, item);
                    break;
                case ConstKeyword item:
                    visitor.VisitConstKeyword(schema, item);
                    break;
                case ContainsKeyword item:
                    visitor.VisitContainsKeyword(schema, item);
                    break;
                case ContentMediaEncodingKeyword item:
                    visitor.VisitContentMediaEncodingKeyword(schema, item);
                    break;
                case ContentMediaTypeKeyword item:
                    visitor.VisitContentMediaTypeKeyword(schema, item);
                    break;
                case ContentSchemaKeyword item:
                    visitor.VisitContentSchemaKeyword(schema, item);
                    break;
                case DefaultKeyword item:
                    visitor.VisitDefaultKeyword(schema, item);
                    break;
                case DefinitionsKeyword item:
                    visitor.VisitDefinitionsKeyword(schema, item);
                    break;
                case DefsKeyword item:
                    visitor.VisitDefsKeyword(schema, item);
                    break;
                case DependenciesKeyword item:
                    visitor.VisitDependenciesKeyword(schema, item);
                    break;
                case DependentRequiredKeyword item:
                    visitor.VisitDependentRequiredKeyword(schema, item);
                    break;
                case DependentSchemasKeyword item:
                    visitor.VisitDependentSchemasKeyword(schema, item);
                    break;
                case DeprecatedKeyword item:
                    visitor.VisitDeprecatedKeyword(schema, item);
                    break;
                case DescriptionKeyword item:
                    visitor.VisitDescriptionKeyword(schema, item);
                    break;
                case DynamicAnchorKeyword item:
                    visitor.VisitDynamicAnchorKeyword(schema, item);
                    break;
                case DynamicRefKeyword item:
                    visitor.VisitDynamicRefKeyword(schema, item);
                    break;
                case EnumKeyword item:
                    visitor.VisitEnumKeyword(schema, item);
                    break;
                case ExamplesKeyword item:
                    visitor.VisitExamplesKeyword(schema, item);
                    break;
                case ExclusiveMaximumKeyword item:
                    visitor.VisitExclusiveMaximumKeyword(schema, item);
                    break;
                case ExclusiveMinimumKeyword item:
                    visitor.VisitExclusiveMinimumKeyword(schema, item);
                    break;
                case FormatKeyword item:
                    visitor.VisitFormatKeyword(schema, item);
                    break;
                case IdKeyword item:
                    visitor.VisitIdKeyword(schema, item);
                    break;
                case IfKeyword item:
                    visitor.VisitIfKeyword(schema, item);
                    break;
                case ElseKeyword item:
                    visitor.VisitElseKeyword(schema, item);
                    break;
                case ThenKeyword item:
                    visitor.VisitThenKeyword(schema, item);
                    break;
                case ItemsKeyword item:
                    visitor.VisitItemsKeyword(schema, item);
                    break;
                case MaxContainsKeyword item:
                    visitor.VisitMaxContainsKeyword(schema, item);
                    break;
                case MaximumKeyword item:
                    visitor.VisitMaximumKeyword(schema, item);
                    break;
                case MaxItemsKeyword item:
                    visitor.VisitMaxItemsKeyword(schema, item);
                    break;
                case MaxLengthKeyword item:
                    visitor.VisitMaxLengthKeyword(schema, item);
                    break;
                case MaxPropertiesKeyword item:
                    visitor.VisitMaxPropertiesKeyword(schema, item);
                    break;
                case MinContainsKeyword item:
                    visitor.VisitMinContainsKeyword(schema, item);
                    break;
                case MinimumKeyword item:
                    visitor.VisitMinimumKeyword(schema, item);
                    break;
                case MinItemsKeyword item:
                    visitor.VisitMinItemsKeyword(schema, item);
                    break;
                case MinLengthKeyword item:
                    visitor.VisitMinLengthKeyword(schema, item);
                    break;
                case MinPropertiesKeyword item:
                    visitor.VisitMinPropertiesKeyword(schema, item);
                    break;
                case MultipleOfKeyword item:
                    visitor.VisitMultipleOfKeyword(schema, item);
                    break;
                case NotKeyword item:
                    visitor.VisitNotKeyword(schema, item);
                    break;
                case OneOfKeyword item:
                    visitor.VisitOneOfKeyword(schema, item);
                    break;
                case PatternKeyword item:
                    visitor.VisitPatternKeyword(schema, item);
                    break;
                case PatternPropertiesKeyword item:
                    visitor.VisitPatternPropertiesKeyword(schema, item);
                    break;
                case PrefixItemsKeyword item:
                    visitor.VisitPrefixItemsKeyword(schema, item);
                    break;
                case PropertiesKeyword item:
                    visitor.VisitPropertiesKeyword(schema, item);
                    break;
                case PropertyNamesKeyword item:
                    visitor.VisitPropertyNamesKeyword(schema, item);
                    break;
                case ReadOnlyKeyword item:
                    visitor.VisitReadOnlyKeyword(schema, item);
                    break;
                case RecursiveAnchorKeyword item:
                    visitor.VisitRecursiveAnchorKeyword(schema, item);
                    break;
                case RecursiveRefKeyword item:
                    visitor.VisitRecursiveRefKeyword(schema, item);
                    break;
                case RefKeyword item:
                    visitor.VisitRefKeyword(schema, item);
                    break;
                case RequiredKeyword item:
                    visitor.VisitRequiredKeyword(schema, item);
                    break;
                case SchemaKeyword item:
                    visitor.VisitSchemaKeyword(schema, item);
                    break;
                case TitleKeyword item:
                    visitor.VisitTitleKeyword(schema, item);
                    break;
                case TypeKeyword item:
                    visitor.VisitTypeKeyword(schema, item);
                    break;
                case UnevaluatedItemsKeyword item:
                    visitor.VisitUnevaluatedItemsKeyword(schema, item);
                    break;
                case UnevaluatedPropertiesKeyword item:
                    visitor.VisitUnevaluatedPropertiesKeyword(schema, item);
                    break;
                case UniqueItemsKeyword item:
                    visitor.VisitUniqueItemsKeyword(schema, item);
                    break;
                case VocabularyKeyword item:
                    visitor.VisitVocabularyKeyword(schema, item);
                    break;
                case WriteOnlyKeyword item:
                    visitor.VisitWriteOnlyKeyword(schema, item);
                    break;
                case InfoKeyword item:
                    visitor.VisitInfoKeyword(schema, item);
                    break;
                case XsdAnyAttributeKeyword item:
                    visitor.VisitXsdAnyAttributeKeyword(schema, item);
                    break;
                case XsdAnyKeyword item:
                    visitor.VisitXsdAnyKeyword(schema, item);
                    break;
                case XsdAttributeKeyword item:
                    visitor.VisitXsdAttributeKeyword(schema, item);
                    break;
                case XsdRestrictionsKeyword item:
                    visitor.VisitXsdRestrictionsKeyword(schema, item);
                    break;
                case XsdStructureKeyword item:
                    visitor.VisitXsdStructureKeyword(schema, item);
                    break;
                case XsdTypeKeyword item:
                    visitor.VisitXsdTypeKeyword(schema, item);
                    break;
                case XsdSchemaAttributesKeyword item:
                    visitor.VisitXsdSchemaAttributesKeyword(schema, item);
                    break;
                case XsdUnhandledAttributesKeyword item:
                    visitor.VisitXsdUnhandledAttributesKeyword(schema, item);
                    break;
                case XsdNamespacesKeyword item:
                    visitor.VisitXsdNamespacesKeyword(schema, item);
                    break;
                default:
                    throw new ArgumentOutOfRangeException(keyword.GetType().Name);
            }
        }
    }
}
