using System;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.More;
using Json.Schema;
using Xunit;
using Xunit.Sdk;

namespace DataModeling.Tests.Assertions
{
    [ExcludeFromCodeCoverage]
    public static class JsonSchemaAssertions
    {
        public static void IsEquivalentTo(JsonSchema expected, JsonSchema actual)
        {
            if (expected.Keywords == null)
            {
                Assert.Null(actual.Keywords);
                return;
            }

            foreach (IJsonSchemaKeyword expectedKeyword in expected.Keywords)
            {
                IJsonSchemaKeyword actualKeyword = actual.Keywords!.SingleOrDefault(kw => string.Equals(expectedKeyword.Keyword(), kw.Keyword()));
                if (actualKeyword == null)
                {
                    throw new ContainsException(expectedKeyword.Keyword(), actual.Keywords);
                }

                IsEquivalentTo(expectedKeyword, actualKeyword);
            }

            foreach (IJsonSchemaKeyword actualKeyword in actual.Keywords!)
            {
                IJsonSchemaKeyword expectedKeyword = expected.Keywords.SingleOrDefault(kw => string.Equals(actualKeyword.Keyword(), kw.Keyword()));
                if (expectedKeyword == null)
                {
                    throw new DoesNotContainException(expected.Keywords, actualKeyword.Keyword());
                }

                IsEquivalentTo(expectedKeyword, actualKeyword);
            }
        }

        public static void IsEquivalentTo(IJsonSchemaKeyword expected, IJsonSchemaKeyword actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);

            Assert.IsType(expected.GetType(), actual);
            Assert.Equal(expected.Keyword(), actual.Keyword());

            switch (expected)
            {
                case AdditionalItemsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (AdditionalItemsKeyword)actual);
                    break;
                case AdditionalPropertiesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (AdditionalPropertiesKeyword)actual);
                    break;
                case AllOfKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (AllOfKeyword)actual);
                    break;
                case AnchorKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (AnchorKeyword)actual);
                    break;
                case AnyOfKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (AnyOfKeyword)actual);
                    break;
                case CommentKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (CommentKeyword)actual);
                    break;
                case ConstKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ConstKeyword)actual);
                    break;
                case ContainsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ContainsKeyword)actual);
                    break;
                case ContentMediaEncodingKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ContentMediaEncodingKeyword)actual);
                    break;
                case ContentMediaTypeKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ContentMediaTypeKeyword)actual);
                    break;
                case ContentSchemaKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ContentSchemaKeyword)actual);
                    break;
                case DefaultKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (DefaultKeyword)actual);
                    break;
                case DefinitionsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (DefinitionsKeyword)actual);
                    break;
                case DefsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (DefsKeyword)actual);
                    break;
                case DependenciesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (DependenciesKeyword)actual);
                    break;
                case DependentRequiredKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (DependentRequiredKeyword)actual);
                    break;
                case DependentSchemasKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (DependentSchemasKeyword)actual);
                    break;
                case DeprecatedKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (DeprecatedKeyword)actual);
                    break;
                case DescriptionKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (DescriptionKeyword)actual);
                    break;
                case DynamicAnchorKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (DynamicAnchorKeyword)actual);
                    break;
                case DynamicRefKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (DynamicRefKeyword)actual);
                    break;
                case ElseKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ElseKeyword)actual);
                    break;
                case EnumKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (EnumKeyword)actual);
                    break;
                case ExamplesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ExamplesKeyword)actual);
                    break;
                case ExclusiveMaximumKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ExclusiveMaximumKeyword)actual);
                    break;
                case ExclusiveMinimumKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ExclusiveMinimumKeyword)actual);
                    break;
                case FormatKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (FormatKeyword)actual);
                    break;
                case IdKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (IdKeyword)actual);
                    break;
                case IfKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (IfKeyword)actual);
                    break;
                case ItemsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ItemsKeyword)actual);
                    break;
                case MaxContainsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MaxContainsKeyword)actual);
                    break;
                case MaximumKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MaximumKeyword)actual);
                    break;
                case MaxItemsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MaxItemsKeyword)actual);
                    break;
                case MaxLengthKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MaxLengthKeyword)actual);
                    break;
                case MaxPropertiesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MaxPropertiesKeyword)actual);
                    break;
                case MinContainsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MinContainsKeyword)actual);
                    break;
                case MinimumKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MinimumKeyword)actual);
                    break;
                case MinItemsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MinItemsKeyword)actual);
                    break;
                case MinLengthKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MinLengthKeyword)actual);
                    break;
                case MinPropertiesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MinPropertiesKeyword)actual);
                    break;
                case MultipleOfKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (MultipleOfKeyword)actual);
                    break;
                case NotKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (NotKeyword)actual);
                    break;
                case OneOfKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (OneOfKeyword)actual);
                    break;
                case PatternKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (PatternKeyword)actual);
                    break;
                case PatternPropertiesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (PatternPropertiesKeyword)actual);
                    break;
                case PrefixItemsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (PrefixItemsKeyword)actual);
                    break;
                case PropertiesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (PropertiesKeyword)actual);
                    break;
                case PropertyNamesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (PropertyNamesKeyword)actual);
                    break;
                case ReadOnlyKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ReadOnlyKeyword)actual);
                    break;
                case RecursiveAnchorKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (RecursiveAnchorKeyword)actual);
                    break;
                case RecursiveRefKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (RecursiveRefKeyword)actual);
                    break;
                case RefKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (RefKeyword)actual);
                    break;
                case RequiredKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (RequiredKeyword)actual);
                    break;
                case SchemaKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (SchemaKeyword)actual);
                    break;
                case ThenKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (ThenKeyword)actual);
                    break;
                case TitleKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (TitleKeyword)actual);
                    break;
                case TypeKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (TypeKeyword)actual);
                    break;
                case UnevaluatedItemsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (UnevaluatedItemsKeyword)actual);
                    break;
                case UnevaluatedPropertiesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (UnevaluatedPropertiesKeyword)actual);
                    break;
                case UniqueItemsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (UniqueItemsKeyword)actual);
                    break;
                case VocabularyKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (VocabularyKeyword)actual);
                    break;
                case WriteOnlyKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (WriteOnlyKeyword)actual);
                    break;
                case InfoKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (InfoKeyword)actual);
                    break;
                case XsdAnyAttributeKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (XsdAnyAttributeKeyword)actual);
                    break;
                case XsdAnyKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (XsdAnyKeyword)actual);
                    break;
                case XsdAttributeKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (XsdAttributeKeyword)actual);
                    break;
                case XsdRestrictionsKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (XsdRestrictionsKeyword)actual);
                    break;
                case XsdStructureKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (XsdStructureKeyword)actual);
                    break;
                case XsdTypeKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (XsdTypeKeyword)actual);
                    break;
                case XsdUnhandledAttributesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (XsdUnhandledAttributesKeyword)actual);
                    break;
                case XsdNamespacesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (XsdNamespacesKeyword)actual);
                    break;
                case XsdSchemaAttributesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (XsdSchemaAttributesKeyword)actual);
                    break;
                case XsdUnhandledEnumAttributesKeyword expectedKeyword:
                    KeywordEqual(expectedKeyword, (XsdUnhandledEnumAttributesKeyword)actual);
                    break;
                default:
                    throw new ArgumentOutOfRangeException(expected.GetType().Name, "Unknown Json Schema Keyword");
            }
        }

        private static void KeywordEqual(AdditionalItemsKeyword expected, AdditionalItemsKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(XsdUnhandledEnumAttributesKeyword expected, XsdUnhandledEnumAttributesKeyword actual)
        {
            Assert.True(expected.Equals(actual));
        }

        private static void KeywordEqual(AdditionalPropertiesKeyword expected, AdditionalPropertiesKeyword actual)
        {
            IsEquivalentTo(expected.Schema, actual.Schema);
        }

        private static void KeywordEqual(AllOfKeyword expected, AllOfKeyword actual)
        {
            Assert.Equal(expected.Schemas.Count, actual.Schemas.Count);
            for (int i = 0; i < expected.Schemas.Count; i++)
            {
                IsEquivalentTo(expected.Schemas[i], actual.Schemas[i]);
            }
        }

        private static void KeywordEqual(AnchorKeyword expected, AnchorKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(AnyOfKeyword expected, AnyOfKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(CommentKeyword expected, CommentKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(ConstKeyword expected, ConstKeyword actual)
        {
            Assert.True(expected.Value.IsEquivalentTo(actual.Value));
        }

        private static void KeywordEqual(ContainsKeyword expected, ContainsKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(ContentMediaEncodingKeyword expected, ContentMediaEncodingKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(ContentMediaTypeKeyword expected, ContentMediaTypeKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(ContentSchemaKeyword expected, ContentSchemaKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(DefaultKeyword expected, DefaultKeyword actual)
        {
            Assert.True(expected.Value.IsEquivalentTo(actual.Value));
        }

        private static void KeywordEqual(DefinitionsKeyword expected, DefinitionsKeyword actual)
        {
            foreach ((string key, JsonSchema value) in expected.Definitions)
            {
                if (!actual.Definitions.TryGetValue(key, out JsonSchema actualProperty))
                {
                    throw new ContainsException(key, actual.Definitions);
                }

                IsEquivalentTo(value, actualProperty);
            }

            foreach ((string key, _) in actual.Definitions)
            {
                if (!expected.Definitions.ContainsKey(key))
                {
                    throw new DoesNotContainException(expected.Definitions, key);
                }
            }
        }

        private static void KeywordEqual(DefsKeyword expected, DefsKeyword actual)
        {
            foreach ((string key, JsonSchema value) in expected.Definitions)
            {
                if (!actual.Definitions.TryGetValue(key, out JsonSchema actualProperty))
                {
                    throw new ContainsException(key, actual.Definitions);
                }

                IsEquivalentTo(value, actualProperty);
            }

            foreach ((string key, _) in actual.Definitions)
            {
                if (!expected.Definitions.ContainsKey(key))
                {
                    throw new DoesNotContainException(expected.Definitions, key);
                }
            }
        }

        private static void KeywordEqual(DependenciesKeyword expected, DependenciesKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(DependentRequiredKeyword expected, DependentRequiredKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(DependentSchemasKeyword expected, DependentSchemasKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(DeprecatedKeyword expected, DeprecatedKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(DescriptionKeyword expected, DescriptionKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(DynamicAnchorKeyword expected, DynamicAnchorKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(DynamicRefKeyword expected, DynamicRefKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(ElseKeyword expected, ElseKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(EnumKeyword expected, EnumKeyword actual)
        {
            Assert.Equal(expected.Values.Count, actual.Values.Count);

            for (int i = 0; i < expected.Values.Count; i++)
            {
                Assert.True(expected.Values[i].IsEquivalentTo(actual.Values[i]));
            }
        }

        private static void KeywordEqual(ExamplesKeyword expected, ExamplesKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(ExclusiveMaximumKeyword expected, ExclusiveMaximumKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(ExclusiveMinimumKeyword expected, ExclusiveMinimumKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(FormatKeyword expected, FormatKeyword actual)
        {
            Assert.Equal(expected.Value.Key, actual.Value.Key);
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(IdKeyword expected, IdKeyword actual)
        {
            Assert.Equal(expected.Id, actual.Id);
        }

        private static void KeywordEqual(IfKeyword expected, IfKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(ItemsKeyword expected, ItemsKeyword actual)
        {
            if (expected.SingleSchema != null)
            {
                IsEquivalentTo(expected.SingleSchema, actual.SingleSchema);
            }

            if (expected.ArraySchemas != null)
            {
                Assert.Equal(expected.ArraySchemas.Count, actual.ArraySchemas.Count);

                for (int i = 0; i < expected.ArraySchemas.Count; i++)
                {
                    IsEquivalentTo(expected.ArraySchemas[i], actual.ArraySchemas[i]);
                }
            }
        }

        private static void KeywordEqual(MaxContainsKeyword expected, MaxContainsKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(MaximumKeyword expected, MaximumKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(MaxItemsKeyword expected, MaxItemsKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(MaxLengthKeyword expected, MaxLengthKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(MaxPropertiesKeyword expected, MaxPropertiesKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(MinContainsKeyword expected, MinContainsKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(MinimumKeyword expected, MinimumKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(MinItemsKeyword expected, MinItemsKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(MinLengthKeyword expected, MinLengthKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(MinPropertiesKeyword expected, MinPropertiesKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(MultipleOfKeyword expected, MultipleOfKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(NotKeyword expected, NotKeyword actual)
        {
            IsEquivalentTo(expected.Schema, actual.Schema);
        }

        private static void KeywordEqual(OneOfKeyword expected, OneOfKeyword actual)
        {
            Assert.Equal(expected.Schemas.Count, actual.Schemas.Count);
            for (int i = 0; i < expected.Schemas.Count; i++)
            {
                IsEquivalentTo(expected.Schemas[i], actual.Schemas[i]);
            }
        }

        private static void KeywordEqual(PatternKeyword expected, PatternKeyword actual)
        {
            Assert.Equal(expected.Value.ToString(), actual.Value.ToString());
        }

        private static void KeywordEqual(PatternPropertiesKeyword expected, PatternPropertiesKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(PrefixItemsKeyword expected, PrefixItemsKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(PropertiesKeyword expected, PropertiesKeyword actual)
        {
            foreach ((string key, JsonSchema value) in expected.Properties)
            {
                if (!actual.Properties.TryGetValue(key, out JsonSchema actualProperty))
                {
                    throw new ContainsException(key, actual.Properties);
                }

                IsEquivalentTo(value, actualProperty);
            }

            foreach ((string key, _) in actual.Properties)
            {
                if (!expected.Properties.ContainsKey(key))
                {
                    throw new DoesNotContainException(expected.Properties, key);
                }
            }
        }

        private static void KeywordEqual(PropertyNamesKeyword expected, PropertyNamesKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(ReadOnlyKeyword expected, ReadOnlyKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(RecursiveAnchorKeyword expected, RecursiveAnchorKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(RecursiveRefKeyword expected, RecursiveRefKeyword actual)
        {
            Assert.Equal(expected.Reference, actual.Reference);
        }

        private static void KeywordEqual(RefKeyword expected, RefKeyword actual)
        {
            Assert.Equal(expected.Reference, actual.Reference);
        }

        private static void KeywordEqual(RequiredKeyword expected, RequiredKeyword actual)
        {
            Assert.Equal(expected.Properties, actual.Properties);
        }

        private static void KeywordEqual(SchemaKeyword expected, SchemaKeyword actual)
        {
            Assert.Equal(expected.Schema, actual.Schema);
        }

        private static void KeywordEqual(ThenKeyword expected, ThenKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(TitleKeyword expected, TitleKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(TypeKeyword expected, TypeKeyword actual)
        {
            Assert.Equal(expected.Type, actual.Type);
        }

        private static void KeywordEqual(UnevaluatedItemsKeyword expected, UnevaluatedItemsKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(UnevaluatedPropertiesKeyword expected, UnevaluatedPropertiesKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(UniqueItemsKeyword expected, UniqueItemsKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(VocabularyKeyword expected, VocabularyKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(WriteOnlyKeyword expected, WriteOnlyKeyword actual)
        {
            throw new NotImplementedException();
        }

        private static void KeywordEqual(InfoKeyword expected, InfoKeyword actual)
        {
            Assert.True(expected.Value.IsEquivalentTo(actual.Value));
        }

        private static void KeywordEqual(XsdAnyAttributeKeyword expected, XsdAnyAttributeKeyword actual)
        {
            Assert.Equal(expected.Id, actual.Id);
            Assert.Equal(expected.Namespace, actual.Namespace);
            Assert.Equal(expected.ProcessContent, actual.ProcessContent);
        }

        private static void KeywordEqual(XsdAnyKeyword expected, XsdAnyKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(XsdAttributeKeyword expected, XsdAttributeKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(XsdRestrictionsKeyword expected, XsdRestrictionsKeyword actual)
        {
            Assert.Equal(expected.Restrictions.Count, actual.Restrictions.Count);
            for (int i = 0; i < expected.Restrictions.Count; i++)
            {
                (string expectedName, JsonElement expectedValue) = expected.Restrictions[i];
                (string actualName, JsonElement actualValue) = actual.Restrictions[i];
                Assert.Equal(expectedName, actualName);
                Assert.True(expectedValue.IsEquivalentTo(actualValue));
            }
        }

        private static void KeywordEqual(XsdStructureKeyword expected, XsdStructureKeyword actual)
        {
            Assert.Equal(expected, actual);
        }

        private static void KeywordEqual(XsdTypeKeyword expected, XsdTypeKeyword actual)
        {
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void KeywordEqual(XsdUnhandledAttributesKeyword expected, XsdUnhandledAttributesKeyword actual)
        {
            Assert.Equal(expected.Properties.Count, expected.Properties.Count);
            for (int i = 0; i < expected.Properties.Count; i++)
            {
                Assert.Equal(expected.Properties[i].name, actual.Properties[i].name);
                Assert.Equal(expected.Properties[i].value, actual.Properties[i].value);
            }
        }

        private static void KeywordEqual(XsdNamespacesKeyword expected, XsdNamespacesKeyword actual)
        {
            Assert.Equal(expected.Namespaces.Count, expected.Namespaces.Count);
            for (int i = 0; i < expected.Namespaces.Count; i++)
            {
                Assert.Equal(expected.Namespaces[i].prefix,  actual.Namespaces[i].prefix);
                Assert.Equal(expected.Namespaces[i].ns, actual.Namespaces[i].ns);
            }
        }

        private static void KeywordEqual(XsdSchemaAttributesKeyword expected, XsdSchemaAttributesKeyword actual)
        {
            Assert.Equal(expected.Properties.Count, expected.Properties.Count);
            for (int i = 0; i < expected.Properties.Count; i++)
            {
                Assert.Equal(expected.Properties[i].name,  actual.Properties[i].name);
                Assert.Equal(expected.Properties[i].value, actual.Properties[i].value);
            }
        }
    }
}
