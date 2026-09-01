namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the deprecated Correspondence surfaces removed in v9. Three groups, each
/// with its own migration guidance: the legacy authorisation model (superseded by
/// <c>CorrespondenceAuthenticationMethod</c>), fields the Correspondence API dropped (which the client
/// already silently discarded), and the legacy notification recipient-override API (superseded by the
/// singular <c>CustomRecipient</c>).
/// </summary>
/// <remarks>
/// Deliberate gaps, because there is no semantic model to resolve a receiver's type: reads of
/// <c>Sender</c>, <c>IsReserved</c>, <c>RequestedSendTime</c> and <c>DataLocationType</c> through a
/// variable (e.g. <c>request.Sender</c>) are not reported - those names are also carried by types that
/// survive v9 (<c>GetCorrespondenceStatusResponse.Sender</c>,
/// <c>CorrespondenceNotificationRecipientResponse.IsReserved</c>, the Notifications feature's own
/// <c>RequestedSendTime</c>, <c>CorrespondenceAttachmentResponse.DataLocationType</c>), so matching them
/// bare would report far more correct code than broken code. They are instead matched precisely where
/// they are assigned in an object initializer of a known type, including a target-typed
/// <c>T x = new() { .. }</c> whose type comes from the declaration.
/// <p>The sharpest edge of that trade: <c>CorrespondenceNotificationOrderResponse.RequestedSendTime</c>
/// and <c>GetCorrespondenceStatusResponse.AllowSystemDeleteAfter</c> are also removed in v9, and an app
/// that <em>reads</em> them is only warned about the latter, whose name is distinctive enough to match
/// bare. A read of the former surfaces as a compiler error with no guidance.</p>
/// Likewise, a removed <c>Func&lt;Task&lt;JwtToken&gt;&gt;</c> payload constructor is only reported when the
/// token factory is passed as a lambda - a variable or method group is indistinguishable from a
/// <c>CorrespondenceAuthenticationMethod</c> without binding, and reporting it would flag already-migrated
/// call sites. Anything missed still fails the app build with a compiler error naming the member.
/// </remarks>
internal sealed class LegacyCorrespondenceCodeDetector
{
    private static readonly IReadOnlySet<string> _removedAuthorisationTypes = new HashSet<string>(
        StringComparer.Ordinal
    )
    {
        "CorrespondenceAuthorisation",
    };

    private const string AuthenticationMethodType = "CorrespondenceAuthenticationMethod";

    private static readonly IReadOnlySet<string> _payloadTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "SendCorrespondencePayload",
        "GetCorrespondenceStatusPayload",
    };

    /// <summary>Index of the authentication argument on both payload constructors.</summary>
    private const int PayloadAuthenticationArgumentIndex = 1;

    private static readonly IReadOnlySet<string> _removedNoOpMethods = new HashSet<string>(StringComparer.Ordinal)
    {
        "WithSender",
        "WithAllowSystemDeleteAfter",
        "WithRequestedSendTime",
        "WithDataLocationType",
    };

    // Distinctive enough to match anywhere they are read or assigned. `AllowSystemDeleteAfter` and
    // `CustomNotificationRecipients` exist nowhere else in the app API surface.
    private static readonly IReadOnlySet<string> _removedDistinctiveMembers = new HashSet<string>(
        StringComparer.Ordinal
    )
    {
        "AllowSystemDeleteAfter",
    };

    private static readonly IReadOnlySet<string> _droppedFieldOwners = new HashSet<string>(StringComparer.Ordinal)
    {
        "CorrespondenceRequest",
        "CorrespondenceNotification",
        "CorrespondenceAttachment",
    };

    private static readonly IReadOnlySet<string> _droppedFieldMembers = new HashSet<string>(StringComparer.Ordinal)
    {
        "Sender",
        "AllowSystemDeleteAfter",
        "RequestedSendTime",
        "DataLocationType",
    };

    // Named alongside the data-location enum because both are removed types whose migration guidance is
    // the same "delete it" as the dropped fields. `ICorrespondenceRequestBuilderSender` existed only to
    // host WithSender, so `WithResourceId` now returns `ICorrespondenceRequestBuilderSendersReference`.
    private static readonly IReadOnlySet<string> _removedDroppedFieldTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "CorrespondenceDataLocationType",
        "ICorrespondenceRequestBuilderSender",
    };

    private static readonly IReadOnlySet<string> _removedOverrideTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "CorrespondenceNotificationRecipientWrapper",
    };

    private static readonly IReadOnlySet<string> _removedOverrideMethods = new HashSet<string>(StringComparer.Ordinal)
    {
        "WithRecipientToOverride",
        "WithCorrespondenceNotificationRecipients",
    };

    private static readonly IReadOnlySet<string> _removedOverrideMemberOwners = new HashSet<string>(
        StringComparer.Ordinal
    )
    {
        "CorrespondenceNotification",
        "CorrespondenceNotificationRecipient",
    };

    private static readonly IReadOnlySet<string> _removedOverrideMembers = new HashSet<string>(StringComparer.Ordinal)
    {
        "CustomNotificationRecipients",
        // Singular, and never obsolete in v8 - v9 replaces it with the plural `CustomRecipients` list.
        // Matched exactly, so the surviving `CustomRecipients` does not hit this.
        "CustomRecipient",
        "IsReserved",
    };

    // Matched anywhere they are read or assigned. Neither name survives v9, and the exact-match keeps the
    // surviving plural `CustomRecipients` from colliding with the removed singular `CustomRecipient`.
    private static readonly IReadOnlySet<string> _removedOverrideDistinctiveMembers = new HashSet<string>(
        StringComparer.Ordinal
    )
    {
        "CustomNotificationRecipients",
        "CustomRecipient",
    };

    private const string AuthorisationSummary =
        "The legacy Correspondence authorisation model is removed in v9. Replace the CorrespondenceAuthorisation "
        + "enum and the SendCorrespondencePayload/GetCorrespondenceStatusPayload overloads taking "
        + "CorrespondenceAuthorisation or Func<Task<JwtToken>> with CorrespondenceAuthenticationMethod: "
        + "CorrespondenceAuthenticationMethod.Default() for a service owner token, or "
        + "CorrespondenceAuthenticationMethod.Custom(factory) to supply your own. Note that Default() requests "
        + "altinn:serviceowner/instances.read and altinn:serviceowner/instances.write in addition to the scopes the "
        + "legacy Maskinporten path requested, so your Maskinporten client must have them. A payload constructed with an "
        + "authentication value held in a variable is listed too, since it cannot be typed without compiling - if it "
        + "is already a CorrespondenceAuthenticationMethod, nothing needs to change. Usages found:";

    private const string DroppedFieldSummary =
        "These Correspondence fields are removed in v9 because the Correspondence API no longer accepts them. The "
        + "removed builder methods were already no-ops that discarded the value, so deleting the calls changes no "
        + "request: drop WithSender (the sender is derived from the Resource Registry via resourceId), "
        + "WithAllowSystemDeleteAfter, WithRequestedSendTime and WithDataLocationType, and stop setting Sender, "
        + "AllowSystemDeleteAfter, RequestedSendTime and DataLocationType. The CorrespondenceDataLocationType enum "
        + "goes with them, as does the ICorrespondenceRequestBuilderSender step interface - WithResourceId now "
        + "returns ICorrespondenceRequestBuilderSendersReference. If you READ one of these instead of setting it, "
        + "the story is different: GetCorrespondenceStatusResponse.AllowSystemDeleteAfter and "
        + "CorrespondenceNotificationOrderResponse.RequestedSendTime are gone from the response with no "
        + "replacement, so that information is no longer available and the feature using it has to go. Usages found:";

    private const string RecipientOverrideSummary =
        "The Correspondence notification recipient-override API changed in v9. Notifications now carry a list: "
        + "CorrespondenceNotification.CustomRecipients replaces the singular CustomRecipient, and "
        + "CorrespondenceNotificationRecipientWrapper plus CustomNotificationRecipients are gone (the API honored "
        + "only that list's first entry). Set recipients with WithRecipientOverride(recipient), which now accumulates "
        + "and can be chained, WithRecipientOverrides(recipients) for several at once, or "
        + "WithRecipientOverrideIfConfigured(recipient) to skip a null. Build each recipient with "
        + "WithOrganizationNumber/WithNationalIdentityNumber/WithEmailAddress/WithMobileNumber, or "
        + "WithOrganisationOrPersonIdentifier for a 1:1 swap of the OrganisationOrPersonIdentifier overload. The "
        + "string overload has no direct replacement - it used to parse the value and convert a FormatException into "
        + "CorrespondenceArgumentException, so call OrganisationOrPersonIdentifier.Parse yourself and handle its "
        + "exceptions. The override builder is otherwise unchanged; only WithRecipientToOverride and "
        + "WithCorrespondenceNotificationRecipients were removed from it. Note that these recipients SUPPLEMENT the "
        + "correspondence recipient's registered contact information rather than replacing it, despite the naming - "
        + "set WithOverrideRegisteredContactInformation(true) if you need only them. IsReserved moves to a DIFFERENT "
        + "object: use IgnoreReservation on the correspondence request, not on the notification recipient. "
        + "Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public LegacyCorrespondenceCodeDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var authorisationMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedAuthorisationTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedAuthorisationTypes))
                .Concat(
                    CSharpSyntaxQueries.ObjectCreationsWithLambdaArgument(
                        file,
                        _payloadTypes,
                        PayloadAuthenticationArgumentIndex
                    )
                )
                // A token factory held in a field or property is indistinguishable from an already-migrated
                // CorrespondenceAuthenticationMethod without binding. Reported anyway: a needless warning
                // costs seconds, whereas staying silent here can hide the whole authorisation break from an
                // app that never writes the enum inline.
                .Concat(
                    CSharpSyntaxQueries.ObjectCreationsWithoutExpectedTypeInArgument(
                        file,
                        _payloadTypes,
                        PayloadAuthenticationArgumentIndex,
                        AuthenticationMethodType
                    )
                )
        );

        var droppedFieldMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .InvokedMethods(file, _removedNoOpMethods)
                .Concat(CSharpSyntaxQueries.MemberReferences(file, _removedDistinctiveMembers))
                .Concat(CSharpSyntaxQueries.ObjectInitializerMembers(file, _droppedFieldOwners, _droppedFieldMembers))
                .Concat(CSharpSyntaxQueries.TypesImplementing(file, _removedDroppedFieldTypes))
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedDroppedFieldTypes))
        );

        var recipientOverrideMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedOverrideTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedOverrideTypes))
                .Concat(CSharpSyntaxQueries.InvokedMethods(file, _removedOverrideMethods))
                .Concat(CSharpSyntaxQueries.MemberReferences(file, _removedOverrideDistinctiveMembers))
                .Concat(
                    CSharpSyntaxQueries.ObjectInitializerMembers(
                        file,
                        _removedOverrideMemberOwners,
                        _removedOverrideMembers
                    )
                )
        );

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(AuthorisationSummary, authorisationMatches),
            WarnOnlyDetector.Report(DroppedFieldSummary, droppedFieldMatches),
            WarnOnlyDetector.Report(RecipientOverrideSummary, recipientOverrideMatches)
        );
    }
}
