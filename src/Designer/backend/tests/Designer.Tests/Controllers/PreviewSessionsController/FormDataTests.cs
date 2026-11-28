using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.TypedHttpClients.PreviewService;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.PreviewSessionsController;

public class FormDataTests : DesignerEndpointsTestsBase<FormDataTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Url = "/designer/api/ttd/apps-test/preview-sessions/form-data";
    private const string SessionUrl = "https://preview.test/0123456789abcdef0123456789abcdef/ttd/apps-test/";
    private const string InstanceId = "51001/7b1b0d6c-1d4e-4c1f-9d0a-2b9b8e1f2a3c";
    private static readonly Guid s_dataElementId = Guid.Parse("0f4e2a1d-8c3b-4b6e-a5d7-9e1c2b3a4f5d");

    private readonly Mock<IPreviewServiceClient> _previewServiceClient = new();

    public FormDataTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_previewServiceClient.Object);
    }

    [Fact]
    public async Task ReadFormData_ReturnsTheDataInTheAuthenticatedDevelopersSession()
    {
        _previewServiceClient
            .Setup(client =>
                client.ReadFormData(
                    "testUser",
                    "ttd",
                    "apps-test",
                    new Uri(SessionUrl),
                    InstanceId,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new List<PreviewFormDataElement>
                {
                    new(s_dataElementId.ToString(), "model", new JsonObject { ["name"] = "Kari" }),
                }
            );

        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(
            Url,
            new { sessionUrl = SessionUrl, instanceId = InstanceId }
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonNode body = JsonNode.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("model", (string)body?["dataElements"]?[0]?["dataType"]);
        Assert.Equal("Kari", (string)body?["dataElements"]?[0]?["data"]?["name"]);
    }

    [Fact]
    public async Task ReadFormData_WithoutTheSession_IsNotFound()
    {
        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(
            Url,
            new { sessionUrl = SessionUrl, instanceId = InstanceId }
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task WriteFormData_ReplacesTheDataInTheAuthenticatedDevelopersSession()
    {
        _previewServiceClient
            .Setup(client =>
                client.WriteFormData(
                    "testUser",
                    "ttd",
                    "apps-test",
                    new Uri(SessionUrl),
                    InstanceId,
                    s_dataElementId,
                    It.Is<JsonObject>(data => (string)data["name"] == "Kari"),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);

        using HttpResponseMessage response = await HttpClient.PutAsJsonAsync(
            Url,
            new
            {
                sessionUrl = SessionUrl,
                instanceId = InstanceId,
                dataElementId = s_dataElementId,
                data = new { name = "Kari" },
            }
        );

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task WriteFormData_RefusesDataThatIsNotAnObject()
    {
        using HttpResponseMessage response = await HttpClient.PutAsJsonAsync(
            Url,
            new
            {
                sessionUrl = SessionUrl,
                instanceId = InstanceId,
                dataElementId = s_dataElementId,
                data = new[] { "Kari" },
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _previewServiceClient.VerifyNoOtherCalls();
    }
}
