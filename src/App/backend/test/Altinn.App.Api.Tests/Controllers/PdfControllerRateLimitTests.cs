using System.Net;
using System.Threading.RateLimiting;
using Altinn.App.Api.Infrastructure.RateLimiting;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Pdf;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
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
    private static readonly Guid _instanceGuid = new("ace19a86-3468-40ee-9393-ee7e0c1ab768");

    public PdfControllerRateLimitTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Fact]
    public async Task Previews_Over_The_Limit_Are_Rejected_Across_Instances()
    {
        using HttpClient client = GetClient(permitLimit: 2);

        try
        {
            using HttpResponseMessage first = await client.GetAsync(PreviewUrl(_instanceGuid));
            using HttpResponseMessage second = await client.GetAsync(PreviewUrl(_instanceGuid));
            // Another instance shares the limit, so it is rejected before the instance is looked up
            using HttpResponseMessage otherInstance = await client.GetAsync(PreviewUrl(Guid.NewGuid()));

            first.StatusCode.Should().Be(HttpStatusCode.OK);
            second.StatusCode.Should().Be(HttpStatusCode.OK);
            otherInstance.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
            otherInstance.Headers.RetryAfter.Should().NotBeNull();
            otherInstance.Headers.RetryAfter!.Delta.Should().BePositive();
        }
        finally
        {
            TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, _instanceGuid);
        }
    }

    [Fact]
    public async Task Previews_Are_Not_Limited_When_The_Limit_Is_Turned_Off()
    {
        using HttpClient client = GetClient(permitLimit: 0);

        try
        {
            for (int i = 0; i < 3; i++)
            {
                using HttpResponseMessage response = await client.GetAsync(PreviewUrl(_instanceGuid));
                response.StatusCode.Should().Be(HttpStatusCode.OK);
            }
        }
        finally
        {
            TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, _instanceGuid);
        }
    }

    [Fact]
    public async Task The_Limit_Uses_The_Configured_Settings_For_All_Instances()
    {
        PdfGeneratorSettings? settings = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["PdfGeneratorSettings:PreviewRateLimit:PermitLimit"] = "3",
                    ["PdfGeneratorSettings:PreviewRateLimit:Window"] = "00:00:30",
                    ["PdfGeneratorSettings:PreviewRateLimit:QueueLimit"] = "1",
                }
            )
            .Build()
            .GetSection(nameof(PdfGeneratorSettings))
            .Get<PdfGeneratorSettings>();
        var policy = new PdfPreviewRateLimiterPolicy(Options.Create(settings!));

        RateLimitPartition<string>[] partitions =
        [
            GetPartition(policy, Guid.NewGuid()),
            GetPartition(policy, Guid.NewGuid()),
        ];
        partitions.Select(partition => partition.PartitionKey).Distinct().Should().ContainSingle();

        using var limiter = (ReplenishingRateLimiter)partitions[0].Factory(partitions[0].PartitionKey);
        limiter.ReplenishmentPeriod.Should().Be(TimeSpan.FromSeconds(30));
        limiter.GetStatistics()!.CurrentAvailablePermits.Should().Be(3);

        using RateLimitLease allPermits = limiter.AttemptAcquire(3);
        ValueTask<RateLimitLease> queued = limiter.AcquireAsync();
        ValueTask<RateLimitLease> overTheQueue = limiter.AcquireAsync();

        allPermits.IsAcquired.Should().BeTrue();
        queued.IsCompleted.Should().BeFalse();
        using RateLimitLease rejected = await overTheQueue;
        rejected.IsAcquired.Should().BeFalse();
    }

    private HttpClient GetClient(int permitLimit)
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
            services.Configure<PdfGeneratorSettings>(settings => settings.PreviewRateLimit.PermitLimit = permitLimit);
        };
        return GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
    }

    private static string PreviewUrl(Guid instanceGuid) =>
        $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{instanceGuid}/pdf/preview";

    private static RateLimitPartition<string> GetPartition(PdfPreviewRateLimiterPolicy policy, Guid instanceGuid)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.RouteValues["instanceGuid"] = instanceGuid.ToString();
        return policy.GetPartition(httpContext);
    }
}
