using System;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.More;
using Json.Schema;
using Json.Schema.Keywords;
using Xunit;
using Xunit.Sdk;

namespace DataModeling.Tests.Assertions
{
    [ExcludeFromCodeCoverage]
    public static class JsonSchemaAssertions
    {
        public static void IsEquivalentTo(JsonSchema expected, JsonSchema actual)
        {
            var expectedKeywords = expected.GetKeywords();
            var actualKeywords = actual.GetKeywords();

            if (expectedKeywords == null)
            {
                Assert.Null(actualKeywords);
                return;
            }

            foreach (KeywordData expectedKd in expectedKeywords)
            {
                KeywordData actualKd = actualKeywords!.SingleOrDefault(kw =>
                    string.Equals(kw.Handler.Name, expectedKd.Handler.Name)
                );
                if (actualKd == null)
                {
                    throw ContainsException.ForCollectionItemNotFound(
                        expectedKd.Handler.Name,
                        string.Join(',', actualKeywords.Select(x => x.Handler.Name))
                    );
                }

                IsEquivalentTo(expectedKd, actualKd);
            }

            foreach (KeywordData actualKd in actualKeywords!)
            {
                KeywordData expectedKd = expectedKeywords.SingleOrDefault(kw =>
                    string.Equals(actualKd.Handler.Name, kw.Handler.Name)
                );
                if (expectedKd == null)
                {
                    throw DoesNotContainException.ForKeyFound(
                        actualKd.Handler.Name,
                        string.Join(',', expectedKeywords.Select(x => x.Handler.Name))
                    );
                }

                IsEquivalentTo(expectedKd, actualKd);
            }
        }

        public static void IsEquivalentTo(KeywordData expected, KeywordData actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);

            Assert.Equal(expected.Handler.GetType(), actual.Handler.GetType());
            Assert.Equal(expected.Handler.Name, actual.Handler.Name);

            // For the type keyword, array values may differ in order
            // e.g., ["string", "null"] vs ["null", "string"] are equivalent
            if (expected.Handler is TypeKeyword)
            {
                AssertTypeKeywordEquivalent(expected.RawValue, actual.RawValue);
                return;
            }

            // For keywords with subschemas (properties, $defs, allOf, etc.),
            // recursively compare sub-schemas
            if (expected.Subschemas is { Length: > 0 } && actual.Subschemas is { Length: > 0 })
            {
                AssertSubschemasEquivalent(expected, actual);
                return;
            }

            // Compare raw JSON values for equivalence
            Assert.True(
                expected.RawValue.IsEquivalentTo(actual.RawValue),
                $"Keyword '{expected.Handler.Name}' raw values differ: {expected.RawValue} vs {actual.RawValue}"
            );
        }

        private static void AssertTypeKeywordEquivalent(JsonElement expected, JsonElement actual)
        {
            if (expected.ValueKind == JsonValueKind.Array && actual.ValueKind == JsonValueKind.Array)
            {
                var expectedTypes = expected.EnumerateArray().Select(e => e.GetString()).OrderBy(s => s).ToList();
                var actualTypes = actual.EnumerateArray().Select(e => e.GetString()).OrderBy(s => s).ToList();
                Assert.True(
                    expectedTypes.SequenceEqual(actualTypes),
                    $"Type keyword values differ: [{string.Join(",", expectedTypes)}] vs [{string.Join(",", actualTypes)}]"
                );
            }
            else
            {
                Assert.True(expected.IsEquivalentTo(actual), $"Type keyword values differ: {expected} vs {actual}");
            }
        }

        private static void AssertSubschemasEquivalent(KeywordData expected, KeywordData actual)
        {
            Assert.Equal(expected.Subschemas.Length, actual.Subschemas.Length);

            if (
                expected.Handler is PropertiesKeyword
                || expected.Handler is DefsKeyword
                || expected.Handler is global::Json.Schema.Keywords.Draft06.DefinitionsKeyword
                || expected.Handler is DependentSchemasKeyword
                || expected.Handler is PatternPropertiesKeyword
            )
            {
                // Keyed subschemas - match by relative path
                foreach (var expectedSub in expected.Subschemas)
                {
                    var expectedPath = expectedSub
                        .RelativePath.GetSegment(expectedSub.RelativePath.SegmentCount - 1)
                        .ToString();
                    var actualSub = actual.Subschemas.FirstOrDefault(s =>
                        s.RelativePath.GetSegment(s.RelativePath.SegmentCount - 1).ToString() == expectedPath
                    );
                    Assert.True(
                        actualSub != null,
                        $"Missing subschema key '{expectedPath}' in keyword '{expected.Handler.Name}'"
                    );
                    var expectedSchema = JsonSchema.Build(expectedSub.Source, JsonSchemaKeywords.GetBuildOptions());
                    var actualSchema = JsonSchema.Build(actualSub.Source, JsonSchemaKeywords.GetBuildOptions());
                    IsEquivalentTo(expectedSchema, actualSchema);
                }
            }
            else
            {
                // Ordered subschemas (allOf, oneOf, anyOf, items, etc.)
                for (int i = 0; i < expected.Subschemas.Length; i++)
                {
                    var expectedSchema = JsonSchema.Build(
                        expected.Subschemas[i].Source,
                        JsonSchemaKeywords.GetBuildOptions()
                    );
                    var actualSchema = JsonSchema.Build(
                        actual.Subschemas[i].Source,
                        JsonSchemaKeywords.GetBuildOptions()
                    );
                    IsEquivalentTo(expectedSchema, actualSchema);
                }
            }
        }
    }
}
