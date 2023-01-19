using System.Linq;
using System.Xml.Serialization;
using DataModeling.Tests.Assertions;
using DataModeling.Tests.BaseClasses;
using Designer.Tests.Factories.ModelFactory.DataClasses;
using FluentAssertions;
using SharedResources.Tests;
using Xunit;

namespace DataModeling.Tests
{
    public class CsharpEnd2EndGenerationTests : CsharpModelConversionTestsBase<CsharpEnd2EndGenerationTests>
    {
        [Theory]
        [ClassData(typeof(CSharpEnd2EndTestData))]
        public void Convert_FromXsd_Should_EqualExpected(string xsdSchemaPath, string expectedCsharpClassPath)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .And.ConvertedJsonSchemaConvertedToModelMetadata()
                .And.ModelMetadataConvertedToCsharpClass()
                .And.CSharpClassesCompiledToAssembly()
                .Then
                .CompiledAssembly.Should().NotBeNull();

            And.GeneratedClassesShouldBeEquivalentToExpected(expectedCsharpClassPath);
        }

        private void GeneratedClassesShouldBeEquivalentToExpected(string expectedCsharpClassPath)
        {
            string expectedClasses = SharedResourcesHelper.LoadTestDataAsString(expectedCsharpClassPath);
            var expectedAssembly = Compiler.CompileToAssembly(expectedClasses);

            // Compare root types.
            var newType = CompiledAssembly.Types().Single(type => type.CustomAttributes.Any(att => att.AttributeType == typeof(XmlRootAttribute)));
            var oldType = expectedAssembly.GetType(newType.FullName);
            oldType.Should().NotBeNull();
            TypeAssertions.IsEquivalentTo(oldType, newType);
        }
    }
}
