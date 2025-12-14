using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.TypedHttpClient.StudioGateway;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Moq.Protected;
using SharedResources.Tests;
using Xunit;
using static Microsoft.Azure.KeyVault.WebKey.JsonWebKeyVerifier;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetFiringAlertsTests : DesignerEndpointsTestsBase<GetFiringAlertsTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string GetUrl(string org, string env) => $"/designer/api/admin/[controller]/{org}/{env}";

        public GetFiringAlertsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "tt02", "testUser", "layoutSet1", "TestData/App/ui/layout-sets.json")]
        [InlineData("ttd", "tt02", "testUser", null, null)]
        public async Task GetFiringAlertsTests_ShouldReturnLayoutSets(string org, string env, string developer, string layoutSetName, string expectedLayoutPaths)
        {
            // Arrange
            var fakeAlerts = new List<StudioGatewayAlert>
        {
            new() { Id = "alert1", Message = "Something went wrong" }
        };
            var json = JsonSerializer.Serialize(fakeAlerts, new JsonSerializerOptions(JsonSerializerDefaults.Web));

            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(json),
                })
                .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("https://example.com")
            };

            var settings = Options.Create(new StudioGatewaySettings
            {
                Environments = new()
                {
                    ["dev"] = new StudioGatewaySettings
                    {
                        Hostname = "https://example.com",
                        Token = "fake-token"
                    }
                }
            });

            var client = new StudioGatewayClient(httpClient, settings);

            // Act
            var result = await client.GetFiringAlertsAsync("ttd", "dev", CancellationToken.None);

            // Assert
            Assert.Single(result);
            Assert.Equal("alert1", ((List<StudioGatewayAlert>)result)[0].Id);

            handlerMock.Protected().Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.Method == HttpMethod.Get &&
                    req.RequestUri!.ToString().EndsWith("/api/v1/alerts")),
                ItExpr.IsAny<CancellationToken>());












            Mock<IStudioGatewayClient<IPreviewClient>> mockClients = new();
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedLayoutSets = string.IsNullOrEmpty(layoutSetName) ? null : await AddLayoutSetsToRepo(TestRepoPath, expectedLayoutPaths);

            string url = GetUrl(org, env);
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseContent = string.IsNullOrEmpty(layoutSetName) ? null : await response.Content.ReadAsStringAsync();
            if (string.IsNullOrEmpty(layoutSetName))
            {
                Assert.Null(responseContent);
            }
            else
            {
                Assert.True(JsonUtils.DeepEquals(expectedLayoutSets, responseContent));
            }









        }

        // [Theory(Skip = "If App/ui is not present in repo, the controller returns 500")]
        // [InlineData("ttd", "tt02", "layoutSet1")]
        // [InlineData("ttd", "tt02", null)]
        // public async Task GetFiringAlertsTests_IfNotExists_Should_AndReturnNotFound(string org, string env, string layoutSetName)
        // {
        //     string url = GetUrl(org, env);
        //     using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        //     using var response = await HttpClient.SendAsync(httpRequestMessage);
        //     Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        // }

        // private async Task<string> AddLayoutSetsToRepo(string createdFolderPath, string expectedLayoutSetsPath)
        // {
        //     string layoutSets = SharedResourcesHelper.LoadTestDataAsString(expectedLayoutSetsPath);
        //     string filePath = Path.Combine(createdFolderPath, "App", "ui", "layout-sets.json");
        //     await File.WriteAllTextAsync(filePath, layoutSets);
        //     return layoutSets;
        // }
    }
}
