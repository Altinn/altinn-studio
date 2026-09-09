using System.Diagnostics;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Tests.Features.Maskinporten;

public class MaskinportenTelemetryTest
{
    private static readonly MaskinportenTokenRequest _fullRequest = new()
    {
        Scopes = ["scope1", "scope2"],
        ConsumerOrg = OrganizationNumber.Parse("991825827"),
        Resource = "https://api.example.com",
        SystemUser = new MaskinportenSystemUser
        {
            Organization = OrganizationNumber.Parse("311169963"),
            ExternalRef = "systembruker-1",
        },
    };

    public static TheoryData<string, Func<TelemetrySink, MaskinportenTokenRequest, Activity?>> ActivityFactories =>
        new()
        {
            {
                "Maskinporten.GetAccessToken",
                static (sink, request) => sink.Object.StartGetAccessTokenActivity("default", "client-id", request)
            },
            {
                "Maskinporten.GetAltinnExchangedAccessToken",
                static (sink, request) =>
                    sink.Object.StartGetAltinnExchangedAccessTokenActivity("default", "client-id", request)
            },
        };

    [Theory]
    [MemberData(nameof(ActivityFactories))]
    public void Activity_TagsEveryDimensionOfTheRequest(
        string expectedName,
        Func<TelemetrySink, MaskinportenTokenRequest, Activity?> factory
    )
    {
        // Arrange
        using var sink = new TelemetrySink();

        // Act
        using (var activity = factory(sink, _fullRequest))
        {
            Assert.NotNull(activity);
        }

        // Assert
        var captured = Assert.Single(sink.CapturedActivities);
        Assert.Equal(expectedName, captured.OperationName);
        Assert.Equal("default", captured.GetTagItem("maskinporten.variant"));
        Assert.Equal("client-id", captured.GetTagItem("maskinporten.client_id"));
        Assert.Equal("scope1 scope2", captured.GetTagItem("maskinporten.scopes"));
        Assert.Equal("991825827", captured.GetTagItem("maskinporten.consumer_org"));
        Assert.Equal("https://api.example.com", captured.GetTagItem("maskinporten.resource"));
        Assert.Equal("0192:311169963", captured.GetTagItem("maskinporten.systemuser_org"));
        Assert.Equal("systembruker-1", captured.GetTagItem("maskinporten.systemuser_external_ref"));
    }

    [Theory]
    [MemberData(nameof(ActivityFactories))]
    public void Activity_OmitsTagsForUnsetClaims(
        string expectedName,
        Func<TelemetrySink, MaskinportenTokenRequest, Activity?> factory
    )
    {
        // Arrange
        using var sink = new TelemetrySink();
        var request = new MaskinportenTokenRequest { Scopes = ["scope1"] };

        // Act
        using (var activity = factory(sink, request))
        {
            Assert.NotNull(activity);
        }

        // Assert
        var captured = Assert.Single(sink.CapturedActivities);
        Assert.Equal(expectedName, captured.OperationName);
        Assert.Equal("scope1", captured.GetTagItem("maskinporten.scopes"));
        Assert.Null(captured.GetTagItem("maskinporten.consumer_org"));
        Assert.Null(captured.GetTagItem("maskinporten.resource"));
        Assert.Null(captured.GetTagItem("maskinporten.systemuser_org"));
        Assert.Null(captured.GetTagItem("maskinporten.systemuser_external_ref"));
    }
}
