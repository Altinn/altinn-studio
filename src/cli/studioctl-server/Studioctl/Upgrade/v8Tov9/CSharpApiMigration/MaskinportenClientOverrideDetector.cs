using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for an app redirecting the built-in Maskinporten client away from the credentials
/// the platform provisions.
/// <para>
/// <c>ConfigureMaskinportenClient</c> configures the <em>default</em> <c>MaskinportenSettings</c> options,
/// and <c>AddMaskinportenClient</c> only binds the provisioned <c>MaskinportenSettings</c> section
/// <em>if nothing else has configured those options already</em>. An app's own registrations run first
/// (<c>RegisterCustomAppServices</c> precedes <c>AddAltinnAppServices</c> in the app template), so a call
/// with a custom section path or a configuration lambda wins and the provisioned credentials are never
/// read. The App backend's own <c>ConfigureMaskinportenClient_OverridesDefaultMaskinportenConfiguration</c>
/// test pins exactly that behavior.
/// </para>
/// <para>
/// In v8 that was harmless - nothing else used the client. In v9 it is not: the same default
/// <c>IMaskinportenClient</c> is what <c>AuthenticationTokenResolver</c> injects to mint the service owner
/// tokens the workflow engine's callbacks run on, so redirecting it breaks the app's process transitions
/// rather than just its own integration. The failure is silent and deployment-only, hence reporting it.
/// </para>
/// <para>
/// Binding the same section the platform uses is a no-op and is not reported; anything else is.
/// </para>
/// </summary>
internal sealed class MaskinportenClientOverrideDetector
{
    private const string ConfigureMethod = "ConfigureMaskinportenClient";

    /// <summary>The section the platform provisions - rebinding to it changes nothing.</summary>
    private const string ProvisionedSectionName = "MaskinportenSettings";

    private const string Summary =
        "This app calls ConfigureMaskinportenClient, which takes over the default Maskinporten client. In v9 "
        + "that client is shared infrastructure: Studio provisions its credentials at deploy time, and the "
        + "workflow engine mints the app's service owner tokens through it, so redirecting it to another configuration "
        + "section or a custom lambda means the provisioned credentials are never read and process transitions "
        + "fail once deployed - silently, and only in a deployed environment. If this configures a Maskinporten "
        + "client for the app's own integration, give that integration its own settings type and HttpClient "
        + "registration instead, and leave the default client alone. Call sites found:";

    private readonly CSharpSourceScanner _scanner;

    public MaskinportenClientOverrideDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(OverridingCalls);
        return WarnOnlyDetector.Report(Summary, matches);
    }

    private static IEnumerable<CSharpApiMatch> OverridingCalls(ScannedCSharpFile file)
    {
        foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var name = invocation.Expression switch
            {
                MemberAccessExpressionSyntax memberAccess => memberAccess.Name,
                MemberBindingExpressionSyntax memberBinding => memberBinding.Name,
                SimpleNameSyntax simple => simple,
                _ => null,
            };

            if (name?.Identifier.Text != ConfigureMethod || RebindsTheProvisionedSection(invocation))
            {
                continue;
            }

            yield return new CSharpApiMatch(file.RelativePath, file.GetLine(name), ConfigureMethod);
        }
    }

    /// <summary>
    /// Whether the call just re-binds the provisioned section by name, which is what the default
    /// registration would have done anyway and therefore changes nothing.
    /// </summary>
    private static bool RebindsTheProvisionedSection(InvocationExpressionSyntax invocation)
    {
        if (invocation.ArgumentList.Arguments.Count != 1)
        {
            return false;
        }

        // A string literal's token carries the string as its value, so matching the constant covers both
        // "is a string literal" and "is the provisioned section name".
        return invocation.ArgumentList.Arguments[0].Expression
            is LiteralExpressionSyntax { Token.Value: ProvisionedSectionName };
    }
}
