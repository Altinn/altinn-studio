namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the removed v9 Altinn Events receive stack: <c>IEventHandler</c>,
/// <c>IEventHandlerResolver</c>, <c>IEventSecretCodeProvider</c> (+ the KeyVault provider),
/// <c>IEventsSubscription</c>/<c>EventsSubscriptionClient</c>, and the built-in handlers behind the
/// deleted <c>/api/v1/eventsreceiver</c> endpoint. Its only first-party consumer was the eFormidling
/// delivery reminder loop, which the workflow engine's delivery wait replaced; the receive surface was
/// removed with it. There is no drop-in replacement, so this only reports what a developer must
/// redesign by hand. Publishing app events (<c>IEventsClient</c>) is untouched and not flagged.
/// </summary>
internal sealed class RemovedEventsReceiveStackDetector
{
    // The Subscription/SubscriptionRequest DTOs are also removed but are far too generically named to
    // match on a simple name; an app touching them names IEventsSubscription in the same file anyway.
    private static readonly IReadOnlySet<string> _removedTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IEventHandler",
        "IEventHandlerResolver",
        "IEventSecretCodeProvider",
        "KeyVaultEventSecretCodeProvider",
        "IEventsSubscription",
        "EventsSubscriptionClient",
        "SubscriptionValidationHandler",
        "UnhandledEventHandler",
        "EventsReceiverController",
    };

    private const string Summary =
        "The Altinn Events receive stack is removed in v9 with no replacement: the app no longer exposes "
        + "/api/v1/eventsreceiver, so IEventHandler implementations are never invoked, and "
        + "IEventsSubscription/IEventSecretCodeProvider have nothing to subscribe or validate for. If the app "
        + "subscribed to its own events as a timer (the pattern the eFormidling reminder loop used), move that "
        + "logic into a BPMN service task - the workflow engine can now wait durably and re-poll on its own "
        + "schedule. Inbound events from other systems need an endpoint the app owns (for example a custom "
        + "controller) designed for that purpose. Publishing app events through IEventsClient still works and is "
        + "not affected. Remove these usages and their DI registrations, or port them by hand:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedEventsReceiveStackDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedTypes))
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }
}
