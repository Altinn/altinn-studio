using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Xml;
using System.Xml.Schema;
using System.Xml.Serialization;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json.Formats;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Utils;
using FluentAssertions;
using Json.Schema;
using Xunit;
using static Designer.Tests.Assertions.TypeAssertions;

namespace Designer.Tests.Factories.ModelFactory;

public class CsharpEnd2EndGenerationTests : FluentTestsBase<CsharpEnd2EndGenerationTests>
{
    private XmlSchema XsdSchema { get; set; }

    private JsonSchema ConvertedJsonSchema { get; set; }

    private ModelMetadata ModelMetadata { get; set; }

    private string CSharpClasses { get; set; }

    private Assembly CompiledAssembly { get; set; }

    private Manatee.Json.Schema.JsonSchema JsonSchemaOld { get; set; }

    private ModelMetadata ModelMetadataOld { get; set; }

    private string CSharpClassesOld { get; set; }

    public CsharpEnd2EndGenerationTests()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
        JsonSchemaFormats.RegisterFormats();
    }

    [Theory]
    [InlineData("Model/Xsd/Gitea/nsm-klareringsportalen.xsd", "ePOB_M")]
    [InlineData("Model/Xsd/Gitea/stami-mu-bestilling-2021.xsd", "MuOrder")]
    [InlineData("Model/Xsd/Gitea/udi-kjaerestebesok.xsd", "soknad")]
    [InlineData("Model/Xsd/Gitea/krt-krt-1226a-1.xsd", "melding")]
    [InlineData("Model/Xsd/Gitea/krt-krt-1228a-1.xsd", "melding")]
    [InlineData("Model/Xsd/Gitea/dat-aarligmelding-bemanning.xsd", "Skjema")]
    [InlineData("Model/Xsd/Gitea/dihe-redusert-foreldrebetaling-bhg.xsd", "XML2Ephorte")]
    [InlineData("Model/Xsd/Gitea/hi-algeskjema.xsd", "schema")]
    [InlineData("Model/Xsd/Gitea/Kursdomene_APINøkkel_M_2020-05-26_5702_34556_SERES.xsd", "melding")]
    [InlineData("Model/Xsd/Gitea/nbib-melding.xsd", "Message")]
    [InlineData("Model/Xsd/Gitea/udir-invitasjon-vfkl.xsd", "GruppeInvitasjon")]
    [InlineData("Model/Xsd/Gitea/udir-vfkl.xsd", "Vurdering")]
    [InlineData("Model/Xsd/Gitea/bokskjema.xsd", "publication")]
    [InlineData("Model/Xsd/Gitea/dat-bilpleie-soknad.xsd", "Skjema")]
    [InlineData("Model/Xsd/Gitea/dat-skjema.xsd", "Skjema")]
    [InlineData("Model/Xsd/Gitea/Kursdomene_BliTjenesteeier_M_2020-05-25_5703_34553_SERES.xsd", "melding")]
    [InlineData("Model/Xsd/Gitea/Kursdomene_BekrefteBruksvilkår_M_2020-05-25_5704_34554_SERES.xsd", "melding")]
    [InlineData("Model/Xsd/Gitea/srf-fufinn-behovskartleggin.xsd", "skjema")]
    [InlineData("Model/Xsd/Gitea/srf-melding-til-statsforvalteren.xsd", "skjema")]
    [InlineData("Model/Xsd/Gitea/udi-unntak-karantenehotell-velferd.xsd", "melding")]
    [InlineData("Model/Xsd/Gitea/RA-0678_M.xsd", "melding")]
    [InlineData("Model/Xsd/Gitea/skjema.xsd", "Skjema")]
    [InlineData("Model/Xsd/Gitea/srf-fufinn-behovsendring.xsd", "skjema")]
    [InlineData("Model/Xsd/Gitea/stami-atid-databehandler-2022.xsd", "DataBehandler")]
    [InlineData("Model/Xsd/Gitea/stami-mu-databehandler-2021.xsd", "DataBehandler")]
    [InlineData("Model/Xsd/Gitea/skd-formueinntekt-skattemelding-v2.xsd", "skattemeldingApp")]
    [InlineData("Model/Xsd/Gitea/aal-vedlegg.xsd", "vedlegg")]
    [InlineData("Model/Xsd/Gitea/aal.xsd", "autorisasjonssoeknad")]
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

    private CsharpEnd2EndGenerationTests XsdSchemaLoaded(string xsdSchemaPath)
    {
        XsdSchema = TestDataHelper.LoadXmlSchemaTestData(xsdSchemaPath);
        return this;
    }

    private CsharpEnd2EndGenerationTests XsdSchemaConverted2JsonSchema()
    {
        var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
        ConvertedJsonSchema = xsdToJsonConverter.Convert(XsdSchema);
        return this;
    }

    private CsharpEnd2EndGenerationTests JsonSchemaConverted2Metamodel(string modelName)
    {
        var strategy = JsonSchemaConverterStrategyFactory.SelectStrategy(ConvertedJsonSchema);
        var metamodelConverter = new JsonSchemaToMetamodelConverter(strategy.GetAnalyzer());

        var convertedJsonSchemaString = JsonSerializer.Serialize(ConvertedJsonSchema, new JsonSerializerOptions()
        {
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
            WriteIndented = true
        });

        ModelMetadata = metamodelConverter.Convert(modelName, convertedJsonSchemaString);
        return this;
    }

    private CsharpEnd2EndGenerationTests CSharpClassesCreatedFromMetamodel()
    {
        CSharpClasses = new JsonMetadataParser().CreateModelFromMetadata(ModelMetadata);
        return this;
    }

    private CsharpEnd2EndGenerationTests XsdSchemaConvertedToJsonSchemaOld(string xsdResource)
    {
        Stream xsdStream = TestDataHelper.LoadTestData(xsdResource);
        XmlReader xmlReader = XmlReader.Create(xsdStream, new XmlReaderSettings { IgnoreWhitespace = true });

        // Compare generated JSON Schema
        var xsdToJsonSchemaConverter = new XsdToJsonSchema(xmlReader);
        JsonSchemaOld = xsdToJsonSchemaConverter.AsJsonSchema();
        return this;
    }

    private CsharpEnd2EndGenerationTests OldJsonSchemaConvertedToMetamodelOld(string org = null, string app = null)
    {
        var converter = new JsonSchemaToInstanceModelGenerator(org, app, JsonSchemaOld);
        ModelMetadataOld = converter.GetModelMetadata();
        return this;
    }

    private CsharpEnd2EndGenerationTests CSharpClassesCreatedFromMetamodelOld()
    {
        CSharpClassesOld = new JsonMetadataParser().CreateModelFromMetadata(ModelMetadataOld);
        return this;
    }

    private CsharpEnd2EndGenerationTests CSharpClassesCompiledToAssembly()
    {
        CompiledAssembly = Compiler.CompileToAssembly(CSharpClasses);
        return this;
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
}
