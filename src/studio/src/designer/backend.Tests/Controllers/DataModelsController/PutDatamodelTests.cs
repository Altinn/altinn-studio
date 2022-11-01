using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using FluentAssertions;
using Json.Schema;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using Xunit;
using static Designer.Tests.Utils.TestDataHelper;

namespace Designer.Tests.Controllers.DataModelsController;

public class PutDatamodelTests : ApiTestsBase<DatamodelsController, PutDatamodelTests>, IDisposable
{
    private const string VersionPrefix = "/designer/api";

    private HttpRequestMessage HttpRequestMessage { get; set; }

    private HttpResponseMessage HttpResponseMessage { get; set; }

    private string TargetTestRepository { get; }

    private bool TestFilesCopied { get; set; }

    private const string TestOrg = "ttd";
    private const string TestSourceRepository = "hvem-er-hvem";
    private const string TestDeveloper = "testUser";

    private const string MinimumValidJsonSchema =
        @"{""properties"":{""root"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";

    public PutDatamodelTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
        TargetTestRepository = Guid.NewGuid().ToString();
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }

    /// <summary>
    /// Will be executed after each test.
    /// </summary>
    public void Dispose()
    {
        if (TestFilesCopied)
        {
            DeleteAppRepository(TestOrg, TargetTestRepository, TestDeveloper);
        }
    }

    [Theory]
    [InlineData("testModel.schema.json")]
    [InlineData("App/models/testModel.schema.json")]
    [InlineData("/App/models/testModel.schema.json")]
    [InlineData("App%2Fmodels%2FtestModel.schema.json")]
    public async Task ValidInput_ShouldReturn_NoContent_And_Create_Files(string modelPath)
    {
        var url = $"{VersionPrefix}/{TestOrg}/{TargetTestRepository}/Datamodels/?modelPath={modelPath}";
        var fileName = Path.GetFileName(HttpUtility.UrlDecode(modelPath));
        var modelName = fileName.Remove(fileName.Length - ".schema.json".Length);

        await Given.That
            .RepositoryCopiedForTest(TestOrg, TestSourceRepository, TestDeveloper, TargetTestRepository);

        And.RequestMessageCreatedFromJsonString(MinimumValidJsonSchema, url);

        await When.HttpRequestSent();
        Then.HttpResponseMessage.StatusCode.Should().Be(HttpStatusCode.NoContent);
        await And.FilesWithCorrectNameAndContentShouldBeCreated(modelName);
    }

    private async Task RepositoryCopiedForTest(string org, string repository, string developer, string targetRepository)
    {
        await CopyRepositoryForTest(org, repository, developer, targetRepository);
        TestFilesCopied = true;
    }

    private PutDatamodelTests RequestMessageCreatedFromJsonString(string json, string url)
    {
        HttpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(json, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        return this;
    }

    private async Task HttpRequestSent()
    {
        HttpResponseMessage = await HttpClient.Value.SendAsync(HttpRequestMessage);
    }

    private async Task FilesWithCorrectNameAndContentShouldBeCreated(string modelName)
    {
        var location = Path.GetFullPath(Path.Combine(TestRepositoriesLocation, TestDeveloper, TestOrg, TargetTestRepository, "App", "models"));
        var jsonSchemaLocation = Path.Combine(location, $"{modelName}.schema.json");
        var xsdSchemaLocation = Path.Combine(location, $"{modelName}.xsd");
        var metamodelLocation = Path.Combine(location, $"{modelName}.metadata.json");

        Assert.True(File.Exists(xsdSchemaLocation));
        Assert.True(File.Exists(metamodelLocation));
        Assert.True(File.Exists(jsonSchemaLocation));

        await VerifyXsdFileContent(xsdSchemaLocation);
        VerifyFileContent(jsonSchemaLocation, MinimumValidJsonSchema);
        VerifyMetadataContent(metamodelLocation, modelName);
    }

    private static async Task VerifyXsdFileContent(string path)
    {
        async Task<string> SerializeXml(XmlSchema schema)
        {
            await using var sw = new Utf8StringWriter();
            await using var xw = XmlWriter.Create(sw, new XmlWriterSettings { Indent = true, Async = true });
            schema.Write(xw);
            return sw.ToString();
        }

        var jsonSchema = JsonSchema.FromText(MinimumValidJsonSchema);
        var converter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());
        var xsd = converter.Convert(jsonSchema);
        var xsdContent = await SerializeXml(xsd);
        VerifyFileContent(path, xsdContent);
    }

    private static void VerifyMetadataContent(string path, string modelName)
    {
        var jsonSchemaConverterStrategy = JsonSchemaConverterStrategyFactory.SelectStrategy(JsonSchema.FromText(MinimumValidJsonSchema));
        var metamodelConverter = new JsonSchemaToMetamodelConverter(jsonSchemaConverterStrategy.GetAnalyzer());
        var modelMetadata = metamodelConverter.Convert(modelName, MinimumValidJsonSchema);
        VerifyFileContent(path,  JsonConvert.SerializeObject(modelMetadata));
    }

    private static void VerifyFileContent(string path, string expectedContent)
    {
        var fileContent = File.ReadAllText(path);
        expectedContent.Should().Be(fileContent);
    }

    private class Utf8StringWriter : StringWriter
    {
        /// <inheritdoc/>
        public override Encoding Encoding => Encoding.UTF8;
    }
}
