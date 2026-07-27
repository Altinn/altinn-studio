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
/// they are assigned in an object initializer of a known type. Likewise, a removed
/// <c>Func&lt;Task&lt;JwtToken&gt;&gt;</c> payload constructor is only reported when the token factory is
/// passed as a lambda, not when it comes from a variable. Anything missed still fails the app build with
/// a compiler error naming the member.
/// </remarks>
internal sealed class LegacyCorrespondenceCodeDetector
{
    private static readonly IReadOnlySet<string> _removedAuthorisationTypes = new HashSet<string>(
        StringComparer.Ordinal
    )
    {
        "CorrespondenceAuthorisation",
    };

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

    private static readonly IReadOnlySet<string> _removedDataLocationTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "CorrespondenceDataLocationType",
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
        "IsReserved",
    };

    private static readonly IReadOnlySet<string> _removedOverrideDistinctiveMembers = new HashSet<string>(
        StringComparer.Ordinal
    )
    {
        "CustomNotificationRecipients",
    };

    private const string AuthorisationSummary =
        "The legacy Correspondence authorisation model is removed in v9. Replace the CorrespondenceAuthorisation "
        + "enum and the SendCorrespondencePayload/GetCorrespondenceStatusPayload overloads taking "
        + "CorrespondenceAuthorisation or Func<Task<JwtToken>> with CorrespondenceAuthenticationMethod: "
        + "CorrespondenceAuthenticationMethod.Default() for a service owner token, or "
        + "CorrespondenceAuthenticationMethod.Custom(factory) to supply your own. Note that Default() requests "
        + "altinn:serviceowner/instances.read and altinn:serviceowner/instances.write in addition to the scopes the "
        + "legacy Maskinporten path requested, so your Maskinporten client must have them. Usages found:";

    private const string DroppedFieldSummary =
        "These Correspondence fields are removed in v9 because the Correspondence API no longer accepts them. The "
        + "removed builder methods were already no-ops that discarded the value, so deleting the calls changes no "
        + "request: drop WithSender (the sender is derived from the Resource Registry via resourceId), "
        + "WithAllowSystemDeleteAfter, WithRequestedSendTime and WithDataLocationType, and stop setting Sender, "
        + "AllowSystemDeleteAfter, RequestedSendTime and DataLocationType. The CorrespondenceDataLocationType enum is "
        + "removed with them. Usages found:";

    private const string RecipientOverrideSummary =
        "The legacy Correspondence notification recipient-override API is removed in v9. Use the singular "
        + "CorrespondenceNotification.CustomRecipient, set via "
        + "WithRecipientOverride(CorrespondenceNotificationRecipient) or "
        + "WithRecipientOverride(ICorrespondenceNotificationOverrideBuilder), and build the recipient with "
        + "WithOrganizationNumber/WithNationalIdentityNumber/WithEmailAddress/WithMobileNumber. The override builder "
        + "itself is unchanged - only WithRecipientToOverride and WithCorrespondenceNotificationRecipients are gone, "
        + "along with CorrespondenceNotificationRecipientWrapper and CustomNotificationRecipients (the API honoured "
        + "only its first entry). Replace IsReserved with IgnoreReservation on the correspondence. Usages found:";

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
        );

        var droppedFieldMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .InvokedMethods(file, _removedNoOpMethods)
                .Concat(CSharpSyntaxQueries.MemberReferences(file, _removedDistinctiveMembers))
                .Concat(CSharpSyntaxQueries.ObjectInitializerMembers(file, _droppedFieldOwners, _droppedFieldMembers))
                .Concat(CSharpSyntaxQueries.TypesImplementing(file, _removedDataLocationTypes))
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedDataLocationTypes))
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
