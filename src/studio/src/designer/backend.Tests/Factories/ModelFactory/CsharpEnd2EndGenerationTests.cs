using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
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
using Xunit.Abstractions;

namespace Designer.Tests.Factories.ModelFactory;

public class CsharpEnd2EndGenerationTests : FluentTestsBase<CsharpEnd2EndGenerationTests>
{
    private XmlSchema XsdSchema { get; set; }

    private JsonSchema ConvertedJsonSchema { get; set; }

    private ModelMetadata ModelMetadata { get; set; }

    private string CSharpClasses { get; set; }

    private Manatee.Json.Schema.JsonSchema JsonSchemaOld { get; set; }

    private ModelMetadata ModelMetadataOld { get; set; }

    private string CSharpClassesOld { get; set; }

    public CsharpEnd2EndGenerationTests(ITestOutputHelper outputHelper)
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
        JsonSchemaFormats.RegisterFormats();
    }

    [Theory]

    // OR analyser not implemented. Works ok with seres
    // [InlineData("Model/Xsd/Gitea/valg-valgkort.xsd", "valgkort")]
    //
    // // Conversion failure
    // // Comment keyword not supported
    // [InlineData("Model/Xsd/Gitea/aal-vedlegg.xsd", "vedlegg")]
    // [InlineData("Model/Xsd/Gitea/aal.xsd", "melding")]

    // // Not defined MaxLengthKeyword for string restriction failing f.eks pattern
    [InlineData("Model/Xsd/Gitea/udi-unntak-karantenehotell-velferd.xsd", "melding")]
    [InlineData("Model/Xsd/Gitea/bokskjema.xsd", "publication")]
    [InlineData("Model/Xsd/Gitea/dat-skjema.xsd", "Skjema")]
    [InlineData("Model/Xsd/Gitea/Kursdomene_BekrefteBruksvilkår_M_2020-05-25_5704_34554_SERES.xsd", "melding")]
    [InlineData("Model/Xsd/Gitea/Kursdomene_BliTjenesteeier_M_2020-05-25_5703_34553_SERES.xsd", "melding")]
    [InlineData("Model/Xsd/Gitea/stami-mu-bestilling-2021.xsd", "MuOrder")]
    [InlineData("Model/Xsd/Gitea/udi-kjaerestebesok.xsd", "Soknad")]
    [InlineData("Model/Xsd/Gitea/srf-fufinn-behovsendring.xsd", "skjema")]
    [InlineData("Model/Xsd/Gitea/srf-melding-til-statsforvalteren.xsd", "skjema")]

    // // Json schema invalid. wrong reference. Non melding root element
    // [InlineData("Model/Xsd/Gitea/brg-anonym-oppstartsveilederen.xsd", "melding")]
    // [InlineData("Model/Xsd/Gitea/brg-oppstartsveilederen.xsd", "melding")]
    // [InlineData("Model/Xsd/Gitea/svv-transportloyvegarantie.xsd", "melding")]
    // [InlineData("Model/Xsd/Gitea/skd-sirius-skattemelding-v1.xsd", "melding")]
    //
    // // Can't load xsd
    // [InlineData("Model/Xsd/Gitea/dsb-melding-om-sikkerhetsraadgiver.xsd", "melding")]
    //
    // // Comparation failure
    // // minLength
    // [InlineData("Model/Xsd/Gitea/dat-asbest-soknad.xsd", "Skjema")]
    // [InlineData("Model/Xsd/Gitea/dat-bilpleie-soknad.xsd", "Skjema")]
    // [InlineData("Model/Xsd/Gitea/skjema.xsd", "Skjema")]
    //
    // // Removed list<string>
    // [InlineData("Model/Xsd/Gitea/epob.xsd", "ePOB_M")]

    // // Some properties are missing: new should be fine
    // [InlineData("Model/Xsd/Gitea/krt-krt-1226a-1.xsd", "melding")]
    // [InlineData("Model/Xsd/Gitea/krt-krt-1228a-1.xsd", "melding")]
    //
    // // Wrong range
    // [InlineData("Model/Xsd/Gitea/RA-0678_M.xsd", "melding")]
    //
    // // Nullable decimal and target namespace
    // [InlineData("Model/Xsd/Gitea/stami-atid-databehandler-2022.xsd", "DataBehandler")]
    // [InlineData("Model/Xsd/Gitea/stami-mu-databehandler-2021.xsd", "DataBehandler")]
    //
    // Only target namespace:
    // [InlineData("Model/Xsd/Gitea/skd-formueinntekt-skattemelding-v2.xsd", "skattemeldingApp")]
    //
    // // Successful:
    // [InlineData("Model/Xsd/Gitea/dat-aarligmelding-bemanning.xsd", "Skjema")]
    // [InlineData("Model/Xsd/Gitea/dihe-redusert-foreldrebetaling-bhg.xsd", "XML2Ephorte")]
    // [InlineData("Model/Xsd/Gitea/hi-algeskjema.xsd", "schema")]
    // [InlineData("Model/Xsd/Gitea/Kursdomene_APINøkkel_M_2020-05-26_5702_34556_SERES.xsd", "melding")]
    // [InlineData("Model/Xsd/Gitea/nbib-melding.xsd", "Message")]
    // [InlineData("Model/Xsd/Gitea/udir-invitasjon-vfkl.xsd", "GruppeInvitasjon")]
    // [InlineData("Model/Xsd/Gitea/udir-vfkl.xsd", "Vurdering")]

    [InlineData("Model/Xsd/Gitea/srf-fufinn-behovskartleggin.xsd", "skjema")]
    public void Convert_FromXsd_ShouldConvertToSameCSharp(string xsdSchemaPath, string modelName)
    {
        Given.That.XsdSchemaLoaded(xsdSchemaPath)
            .When.XsdSchemaConverted2JsonSchema()
            .And.JsonSchemaConverted2Metamodel(modelName)
            .And.CSharpClassesCreatedFromMetamodel()
            .And.When.XsdSchemaConvertedToJsonSchemaOld(xsdSchemaPath)
            .And.OldJsonSchemaConvertedToMetamodelOld()
            .And.CSharpClassesCreatedFromMetamodelOld();

        And.WriteAllDataToPath(
                @"C:\Users\misha\Documents\digdir\data\csharp_generation",
                Path.GetFileNameWithoutExtension(xsdSchemaPath));

        Then.CSharpClasses.Should().BeEquivalentTo(CSharpClassesOld);
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
        XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(xmlReader);
        JsonSchemaOld = xsdToJsonSchemaConverter.AsJsonSchema();
        return this;
    }

    private CsharpEnd2EndGenerationTests OldJsonSchemaConvertedToMetamodelOld(string org = null, string app = null)
    {
        JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(org, app, JsonSchemaOld);
        ModelMetadata modelMetadata = converter.GetModelMetadata();
        ModelMetadataOld = converter.GetModelMetadata();
        return this;
    }

    private CsharpEnd2EndGenerationTests CSharpClassesCreatedFromMetamodelOld()
    {
        CSharpClassesOld = new JsonMetadataParser().CreateModelFromMetadata(ModelMetadataOld);
        return this;
    }

    private CsharpEnd2EndGenerationTests OldMetadataLoaded(string path)
    {
        var expectedMetamodelJson = TestDataHelper.LoadTestDataFromFileAsString(path);
        ModelMetadataOld = JsonSerializer.Deserialize<ModelMetadata>(
            expectedMetamodelJson,
            new JsonSerializerOptions()
                { PropertyNameCaseInsensitive = true, Converters = { new JsonStringEnumConverter() } });
        return this;
    }

    // Debugging methods
    private CsharpEnd2EndGenerationTests WriteAllDataToPath(string path, string fileNameWithoutExtension)
    {
        static async Task<string> Serialize(XmlSchema xmlSchema)
        {
            await using var sw = new Utf8StringWriter();
            await using var xw = XmlWriter.Create(sw, new XmlWriterSettings { Indent = true, Async = true });
            xmlSchema.Write(xw);
            return sw.ToString();
        }

        File.WriteAllText(Path.Combine(path, $"{fileNameWithoutExtension}.metamodel.json"), JsonSerializer.Serialize(ModelMetadata, new JsonSerializerOptions()
        {
            Encoder =
                JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
            WriteIndented = true
        }));
        File.WriteAllText(Path.Combine(path, $"{fileNameWithoutExtension}.metamodel.old.json"), JsonSerializer.Serialize(ModelMetadataOld, new JsonSerializerOptions()
        {
            Encoder =
                JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
            WriteIndented = true
        }));

        File.WriteAllText(Path.Combine(path, $"{fileNameWithoutExtension}.json"), JsonSerializer.Serialize(ConvertedJsonSchema, new JsonSerializerOptions()
        {
            Encoder =
                JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
            WriteIndented = true
        }));
        File.WriteAllText(Path.Combine(path, $"{fileNameWithoutExtension}.cs"), CSharpClasses);
        File.WriteAllText(Path.Combine(path, $"{fileNameWithoutExtension}.old.cs"), CSharpClassesOld);
        File.WriteAllText(Path.Combine(path, $"{fileNameWithoutExtension}.xsd"), Serialize(XsdSchema).Result);
        return this;
    }

    private class Utf8StringWriter : StringWriter
    {
        public override Encoding Encoding => Encoding.UTF8;
    }

}
