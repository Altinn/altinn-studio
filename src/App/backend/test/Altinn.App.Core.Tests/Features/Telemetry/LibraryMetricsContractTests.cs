using System.Diagnostics.Metrics;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using static Altinn.App.Core.Features.Telemetry.Notifications;

namespace Altinn.App.Core.Tests.Features.Telemetry;

/// <summary>
/// The library's metrics are a contract with the collectors in the runtime clusters: their VictoriaMetrics allowlist
/// (infra/observability) selects the Altinn.App meter and drops points with attribute values it doesn't know. A change
/// here needs the same change there, and dashboards and alerts may read the names too.
/// </summary>
public class LibraryMetricsContractTests
{
    private const string Contract =
        "The collectors' allowlist in infra/observability selects these metrics and attribute values. Change it too.";

    [Fact]
    public void Library_Metrics_Are_The_Ones_The_Collectors_Know()
    {
        using var telemetry = new Core.Features.Telemetry(
            new AppIdentifier("ttd", "contract"),
            Microsoft.Extensions.Options.Options.Create(new AppSettings())
        );
        List<string> instruments = [];
        using (var listener = new MeterListener())
        {
            listener.InstrumentPublished = (instrument, _) =>
            {
                if (ReferenceEquals(instrument.Meter, telemetry.LibraryMeter))
                    instruments.Add($"{instrument.Name} {instrument.Unit} {instrument.GetType().Name}");
            };
            listener.Start();
        }

        string[] expected =
        [
            "altinn.app_lib.correspondence.orders {correspondence} Counter`1",
            "altinn.app_lib.data.patched {patch} Counter`1",
            "altinn.app_lib.fiks.messages.received {message} Counter`1",
            "altinn.app_lib.fiks.messages.sent {message} Counter`1",
            "altinn.app_lib.instances.completed {instance} Counter`1",
            "altinn.app_lib.instances.created {instance} Counter`1",
            "altinn.app_lib.instances.deleted {instance} Counter`1",
            "altinn.app_lib.instances.duration s Histogram`1",
            "altinn.app_lib.maskinporten.altinn_token_exchanges {request} Counter`1",
            "altinn.app_lib.maskinporten.token_requests {request} Counter`1",
            "altinn.app_lib.notification.order_cancellations {cancellation} Counter`1",
            "altinn.app_lib.notification.orders {order} Counter`1",
            "altinn.app_lib.processes.duration s Histogram`1",
            "altinn.app_lib.processes.ended {process} Counter`1",
            "altinn.app_lib.processes.started {process} Counter`1",
            "altinn.app_lib.signing.delegation_revocations {revocation} Counter`1",
            "altinn.app_lib.signing.delegations {delegation} Counter`1",
            "altinn.app_lib.signing.service_owner_party_lookups {lookup} Counter`1",
            "altinn.app_lib.signing.signee_notifications {notification} Counter`1",
        ];
        Assert.True(expected.SequenceEqual(instruments.Order(StringComparer.Ordinal)), Contract);
        Assert.Equal("Altinn.App", telemetry.LibraryMeter.Name);
    }

    [Fact]
    public void Attribute_Values_Are_The_Ones_The_Collectors_Know()
    {
        Assert.True(
            Core.Features.Telemetry.ErrorTypeOther == "_OTHER"
                && Core.Features.Telemetry.ErrorTypeCancelled == "cancelled",
            Contract
        );
        Assert.True(
            OrderTypeExtensions
                .GetValues()
                .Select(t => t.ToStringFast(useMetadataAttributes: true))
                .SequenceEqual(["sms", "email", "future"]),
            Contract
        );
        Assert.True(
            Core.Features.Telemetry.InternalLabels.ErrorType == "error.type"
                && Core.Features.Telemetry.InternalLabels.NotificationType == "altinn.notification.type"
                && Core.Features.Telemetry.InternalLabels.MaskinportenTokenCached == "altinn.maskinporten.token.cached",
            Contract
        );
    }
}
