using System.Net;
using Altinn.App.Api.Infrastructure.RateLimiting;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Pdf;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class PdfControllerRateLimitTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;
    private static readonly Guid _instanceGuid = new("00000000-dead-0000-babe-000000000999");

    public PdfControllerRateLimitTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Theory]
    [InlineData(2, HttpStatusCode.TooManyRequests)]
    [InlineData(0, HttpStatusCode.OK)]
    public async Task Preview_Over_The_Limit_For_An_Instance_Is_Rejected(
        int previewRequestsPerMinute,
        HttpStatusCode expectedThirdStatus
    )
    {
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        var pdfGeneratorClient = new Mock<IPdfGeneratorClient>();
        pdfGeneratorClient
            .Setup(p =>
                p.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new MemoryStream());
        OverrideServicesForThisTest = services =>
        {
            services.AddSingleton(pdfGeneratorClient.Object);
            services.Configure<PdfGeneratorSettings>(settings =>
                settings.PreviewRequestsPerMinute = previewRequestsPerMinute
            );
        };
        using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        string url = $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{_instanceGuid}/pdf/preview";

        try
        {
            using HttpResponseMessage first = await client.GetAsync(url);
            using HttpResponseMessage second = await client.GetAsync(url);
            using HttpResponseMessage third = await client.GetAsync(url);

            first.StatusCode.Should().Be(HttpStatusCode.OK);
            second.StatusCode.Should().Be(HttpStatusCode.OK);
            third.StatusCode.Should().Be(expectedThirdStatus);
            if (expectedThirdStatus == HttpStatusCode.TooManyRequests)
            {
                third.Headers.RetryAfter.Should().NotBeNull();
                third.Headers.RetryAfter!.Delta.Should().BePositive();
            }
        }
        finally
        {
            TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, _instanceGuid);
        }
    }

    [Fact]
    public void Previews_Are_Limited_Per_Instance()
    {
        var policy = new PdfPreviewRateLimiterPolicy(Options.Create(new PdfGeneratorSettings()));
        var instances = new[] { Guid.NewGuid(), Guid.NewGuid() };

        string[] partitionKeys = instances
            .Select(instanceGuid =>
            {
                var httpContext = new DefaultHttpContext();
                httpContext.Request.RouteValues["instanceGuid"] = instanceGuid.ToString();
                return policy.GetPartition(httpContext).PartitionKey;
            })
            .ToArray();

        partitionKeys.Should().Equal(instances.Select(instanceGuid => instanceGuid.ToString()));
    }
}
