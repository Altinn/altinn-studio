using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Pointer;
using SharedResources.Tests;
using Xunit;

namespace DataModeling.Tests.Json
{
    public class SeresStrategyTests
    {
        [Theory]
        [InlineData(@"Model/JsonSchema/Seres/SeresBasicSchema.json")]
        public Task Analyze_Seres_Converted_JsonSchema(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = SharedResourcesHelper.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            Assert.Equal(CompatibleXsdType.ComplexType, metadata.GetCompatibleTypes(JsonPointer.Parse("#")).Single());
            Assert.Equal(CompatibleXsdType.ComplexType, metadata.GetCompatibleTypes(JsonPointer.Parse("#/oneOf/[0]")).Single());
            Assert.Equal(CompatibleXsdType.ComplexType, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/melding-modell")).Single());
            Assert.Equal(CompatibleXsdType.SimpleType, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/melding-modell/properties/e1")).Single());

            return Task.CompletedTask;
        }

        [Theory]
        [InlineData(@"Model/JsonSchema/General/SimpleContentExtension.json")]
        public Task Analyze_SimpleContent_Extension(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = SharedResourcesHelper.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            Assert.Contains(CompatibleXsdType.ComplexType, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/myBase")));
            Assert.Contains(CompatibleXsdType.SimpleContentExtension, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/myBase")));
            return Task.CompletedTask;
        }

        [Theory]
        [InlineData(@"Model/JsonSchema/Seres/SeresSimpleTypeRestrictions.json")]
        public Task Analyze_SimpleType_Restriction(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = SharedResourcesHelper.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction,
                metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/t1")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/t2")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/t3")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/t4")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/n1")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/n2")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f1")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f2")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f3")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f4")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f5")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/f6")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/properties/c0")));

            Assert.Contains(CompatibleXsdType.SimpleType, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/simpleString")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/SeresType")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/simpleString")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/stringMinMaxLengthRestrictions")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/stringLengthRestrictions")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/stringEnumRestrictions")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/stringPatternRestrictions")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictions")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictions2")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional0")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional1")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional2")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional3")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional4")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/numberRestrictionsFractional5")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/complexStructure")));
            return Task.CompletedTask;
        }

        [Theory]
        [InlineData(@"Model/JsonSchema/Seres/SeresSimpleContentRestriction.json")]
        public Task Analyze_SimpleContent_Restriction(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = SharedResourcesHelper.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            Assert.Contains(CompatibleXsdType.SimpleType, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/ageType")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/limitedAgeType")));
            Assert.Contains(CompatibleXsdType.SimpleType, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/genderType")));
            Assert.Contains(CompatibleXsdType.SimpleTypeRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/limitedGenderType")));
            Assert.Contains(CompatibleXsdType.SimpleContentExtension, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/person")));
            Assert.Contains(CompatibleXsdType.SimpleContentRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/limitedPerson")));
            Assert.Contains(CompatibleXsdType.SimpleContentRestriction, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/limitedPerson-inline")));
            return Task.CompletedTask;
        }

        [Theory]
        [InlineData(@"Model/JsonSchema/Seres/SeresComplexContentExtension.json")]
        public Task Analyze_ComplexContent_Extension(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = SharedResourcesHelper.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            Assert.Contains(CompatibleXsdType.ComplexContentExtension, metadata.GetCompatibleTypes(JsonPointer.Parse("#")));
            Assert.Contains(CompatibleXsdType.ComplexType, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/myBase")));
            Assert.Contains(CompatibleXsdType.ComplexType, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/badBoy")));
            Assert.Contains(CompatibleXsdType.ComplexContentExtension, metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/badBoy/properties/reallyNasty")));

            return Task.CompletedTask;
        }
    }
}
