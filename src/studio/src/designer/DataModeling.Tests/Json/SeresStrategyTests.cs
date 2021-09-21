using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json.Keywords;
using FluentAssertions;
using Json.Pointer;
using Xunit;

namespace DataModeling.Tests.Json
{
    public class SeresStrategyTests
    {
        [Theory]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema.json")]
        public async Task Analyze_Seres_Converted_JsonSchema(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            metadata.GetCompatibleTypes(JsonPointer.Parse("#")).Should().Equal(CompatibleXsdType.ComplexType);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/oneOf/[0]")).Should().Equal(CompatibleXsdType.ComplexType);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/melding-modell")).Should().Equal(CompatibleXsdType.ComplexType);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/melding-modell/properties/e1")).Should().Equal(CompatibleXsdType.SimpleType);
        }

        [Theory]
        [InlineData(@"Model\JsonSchema\SimpleContentExtension.json")]
        public async Task Analyze_SimpleContent_Extension(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/myBase")).Should().Contain(new[] { CompatibleXsdType.ComplexType, CompatibleXsdType.SimpleContentExtension });
        }

        [Theory]
        [InlineData(@"Model\JsonSchema\SeresSimpleTypeRestrictions.json")]
        public async Task Analyze_SimpleType_Restriction(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/t1")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/t2")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/t3")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/t4")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/n1")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/n2")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f1")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f2")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f3")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f4")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f5")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f6")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/c0")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);

            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/simpleString")).Should().Contain(CompatibleXsdType.SimpleType);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/SeresType")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/simpleString")).Should().NotContain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/stringMinMaxLengthRestrictions")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/stringLengthRestrictions")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/stringEnumRestrictions")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/stringPatternRestrictions")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictions")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictions2")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional0")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional1")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional2")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional3")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional4")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional5")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/complexStructure")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
        }

        [Theory]
        [InlineData(@"Model\JsonSchema\SeresSimpleContentRestriction.json")]
        public async Task Analyze_SimpleContent_Restriction(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/ageType")).Should().Contain(CompatibleXsdType.SimpleType);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/limitedAgeType")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/genderType")).Should().Contain(CompatibleXsdType.SimpleType);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/limitedGenderType")).Should().Contain(CompatibleXsdType.SimpleTypeRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/person")).Should().Contain(CompatibleXsdType.SimpleContentExtension);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/limitedPerson")).Should().Contain(CompatibleXsdType.SimpleContentRestriction);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/limitedPerson-inline")).Should().Contain(CompatibleXsdType.SimpleContentRestriction);
        }

        [Theory]
        [InlineData(@"Model\JsonSchema\SeresComplexContentExtension.json")]
        public async Task Analyze_ComplexContent_Extension(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            metadata.GetCompatibleTypes(JsonPointer.Parse("#")).Should().Contain(CompatibleXsdType.ComplexContentExtension);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/myBase")).Should().Contain(CompatibleXsdType.ComplexType);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/badBoy")).Should().Contain(CompatibleXsdType.ComplexType);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/badBoy/properties/reallyNasty")).Should().Contain(CompatibleXsdType.ComplexContentExtension);
        }
    }
}
