using System;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Xml.Serialization;
using Designer.Tests.Factories.ModelFactory.BaseClasses;
using Designer.Tests.Factories.ModelFactory.DataClasses;
using Designer.Tests.Utils;
using FluentAssertions;
using Xunit;
using static Designer.Tests.Assertions.TypeAssertions;

namespace Designer.Tests.Factories.ModelFactory;

public class CsharpEnd2EndGenerationTests : Xsd2CsharpBaseClass<CsharpEnd2EndGenerationTests>
{
    [Theory]
    [ClassData(typeof(CSharpEnd2EndTestData))]
    public void Convert_FromXsd_ShouldConvertToSameCSharp(string xsdSchemaPath, string modelName)
    {
        Given.That.XsdSchemaLoaded(xsdSchemaPath)
            .When.XsdSchemaConverted2JsonSchema()
            .And.JsonSchemaConverted2Metamodel(modelName)
            .And.CSharpClassesCreatedFromMetamodel()
            .And.When.XsdSchemaConvertedToJsonSchemaOld(xsdSchemaPath)
            .And.OldJsonSchemaConvertedToMetamodelOld()
            .And.CSharpClassesCreatedFromMetamodelOld()
            .And.CSharpClassesCompiledToAssembly()
            .Then.CompiledAssembly.Should().NotBeNull();

        And.GeneratedClassesShouldBeEquivalent();
    }

    // enum, max/min exclusive, fractions are ignored in c# class.
    [Theory]
    [ClassData(typeof(CSharpE2ERestrictionsTestData))]
    public void Convert_CSharpClass_ShouldContainRestriction(string xsdSchemaPath, string modelName, string propertyName, string expectedPropertyType, string restrictionString)
    {
        Given.That.XsdSchemaLoaded(xsdSchemaPath)
            .When.XsdSchemaConverted2JsonSchema()
            .And.JsonSchemaConverted2Metamodel(modelName)
            .And.CSharpClassesCreatedFromMetamodel()
            .And.CSharpClassesCompiledToAssembly()
            .Then.CompiledAssembly.Should().NotBeNull();

        And.PropertyShouldHaveDefinedTypeAndContainAnnotation(modelName, propertyName, expectedPropertyType, restrictionString);
    }

    // Old classes are not maintained anymore, so Namespace feature that new classes have is added to old classes before comparison.
    private CsharpEnd2EndGenerationTests GeneratedClassesShouldBeEquivalent()
    {
        var expectedClasses = CSharpClassesOld;
        if (XsdSchema.TargetNamespace != null)
        {
            // Add namespace to old classes
            var xmlRootLine = CSharpClassesOld.Split(Environment.NewLine).Single(line => line.Contains("[XmlRoot(ElementName="));
            expectedClasses = expectedClasses.Replace(xmlRootLine, xmlRootLine[..^2] + $", Namespace=\"{XsdSchema.TargetNamespace}\")]");
        }

        var oldAssembly = Compiler.CompileToAssembly(expectedClasses);

        // Compare root types.
        var newType = CompiledAssembly.Types().Single(type => type.CustomAttributes.Any(att => att.AttributeType == typeof(XmlRootAttribute)));
        var oldType = oldAssembly.GetType(newType.FullName);
        oldType.Should().NotBeNull();
        IsEquivalentTo(oldType, newType);
        return this;
    }

    private void PropertyShouldHaveDefinedTypeAndContainAnnotation(string className, string propertyName, string propertyType, string annotationString)
    {
        var type = CompiledAssembly.Types().Single(type => type.Name == className);
        PropertyShouldContainCustomAnnotationAndHaveTypeType(type, propertyName, propertyType, annotationString);
    }
}
