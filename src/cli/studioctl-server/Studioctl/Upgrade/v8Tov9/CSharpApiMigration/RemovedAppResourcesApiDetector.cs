using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for two v9 <c>IDataClient</c>/<c>IAppResources</c> breaks that have a replacement
/// but no mechanical rewrite, because the replacement is asynchronous where the removed member was
/// synchronous, or takes a materially different parameter shape:
/// <list type="bullet">
/// <item>
/// <c>IAppResources.GetApplication()</c>/<c>GetApplicationXACMLPolicy()</c>/<c>GetApplicationBPMNProcess()</c>
/// are removed. <c>IAppMetadata.GetApplicationMetadata()</c>/<c>GetApplicationXACMLPolicy()</c>/
/// <c>GetApplicationBPMNProcess()</c> replace them, but return a <c>Task</c> - porting the call site
/// means making the enclosing method async (or blocking on the task), which is a judgment call.
/// </item>
/// <item>
/// The two <c>IDataClient.UpdateBinaryData</c> overloads taking an <c>HttpRequest</c> and separate
/// <c>org</c>/<c>app</c> strings are removed. The replacement takes an <c>InstanceIdentifier</c> and a
/// <c>Stream</c> instead, and does not accept the filename from the request's Content-Disposition
/// header the way <c>HttpRequest.CreateContentStream()</c> did - porting the call site means deciding
/// what filename (if any) to pass, so this is reported rather than guessed.
/// </item>
/// </list>
/// <c>GetApplicationXACMLPolicy</c>/<c>GetApplicationBPMNProcess</c> share their exact name and arity
/// with the still-current <c>IAppMetadata</c> replacement, so telling the removed call from a
/// already-migrated one needs the semantic model; without one (see <see cref="CSharpSourceScanner.HasSemanticModels"/>)
/// this only reports the unambiguous <c>GetApplication()</c>, and <c>UpdateBinaryData</c> calls that
/// pass a receiver-qualified <c>Request</c> argument - the shape every real call site takes, since the
/// v9 overload has no parameter an <c>HttpRequest</c> could satisfy.
/// </summary>
internal sealed class RemovedAppResourcesApiDetector
{
    private const string AppResourcesTypeName = "IAppResources";
    private const string DataClientTypeName = "IDataClient";
    private const string HttpRequestTypeName = "HttpRequest";
    private const string UpdateBinaryDataMethodName = "UpdateBinaryData";
    private const string RequestArgumentName = "Request";

    private static readonly IReadOnlySet<string> _appResourcesMethodNames = new HashSet<string>(StringComparer.Ordinal)
    {
        "GetApplication",
        "GetApplicationXACMLPolicy",
        "GetApplicationBPMNProcess",
    };

    private static readonly IReadOnlySet<string> _updateBinaryDataMethodNames = new HashSet<string>(
        StringComparer.Ordinal
    )
    {
        UpdateBinaryDataMethodName,
    };

    private const string AppResourcesSummary =
        "IAppResources.GetApplication()/GetApplicationXACMLPolicy()/GetApplicationBPMNProcess() are removed "
        + "in v9. Use IAppMetadata.GetApplicationMetadata()/GetApplicationXACMLPolicy()/GetApplicationBPMNProcess() "
        + "instead - inject IAppMetadata alongside (or instead of) IAppResources, and await the call; making the "
        + "enclosing method async is a judgment call the upgrade leaves to you. Call sites found:";

    private const string UpdateBinaryDataSummary =
        "The IDataClient.UpdateBinaryData overloads taking an HttpRequest and separate org/app strings are "
        + "removed in v9. Use UpdateBinaryData(InstanceIdentifier, contentType, filename, dataGuid, stream) "
        + "instead: pass new InstanceIdentifier(instanceOwnerPartyId, instanceGuid), Request.ContentType, a "
        + "filename (the old overload read one from the request's Content-Disposition header - decide whether "
        + "this call site needs one), and Request.Body as the stream. Call sites found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedAppResourcesApiDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var appResourcesMatches = _scanner.Files.SelectMany(file =>
            file.SemanticModel is { } semanticModel
                ? CSharpSemanticQueries.InvokedAltinnMethods(
                    file,
                    semanticModel,
                    _appResourcesMethodNames,
                    containingTypeName: AppResourcesTypeName
                )
                : CSharpSyntaxQueries.InvokedMethodsWithArity(file, "GetApplication", argumentCount: 0)
        );

        var updateBinaryDataMatches = _scanner.Files.SelectMany(file =>
            file.SemanticModel is { } semanticModel
                ? CSharpSemanticQueries.InvokedAltinnMethods(
                    file,
                    semanticModel,
                    _updateBinaryDataMethodNames,
                    containingTypeName: DataClientTypeName,
                    predicate: method => method.Parameters.Any(p => p.Type.Name == HttpRequestTypeName)
                )
                : SyntaxUpdateBinaryDataMatches(file)
        );

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(AppResourcesSummary, appResourcesMatches),
            WarnOnlyDetector.Report(UpdateBinaryDataSummary, updateBinaryDataMatches)
        );
    }

    /// <summary>
    /// Without a semantic model, arity alone cannot separate the removed overloads from the surviving
    /// ones - both accept 6 or 7 arguments depending on which optional parameters are supplied. The one
    /// reliable syntax-only signal is a receiver-qualified <c>Request</c> argument: the v9 overload has
    /// no parameter an <c>HttpRequest</c> could satisfy, so no genuine v9 call site passes one.
    /// </summary>
    private static IEnumerable<CSharpApiMatch> SyntaxUpdateBinaryDataMatches(ScannedCSharpFile file)
    {
        foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var invokedName = invocation.Expression switch
            {
                MemberAccessExpressionSyntax memberAccess => memberAccess.Name,
                SimpleNameSyntax simple => simple,
                _ => null,
            };

            if (invokedName?.Identifier.Text != UpdateBinaryDataMethodName)
            {
                continue;
            }

            var hasRequestArgument = invocation.ArgumentList.Arguments.Any(argument =>
                TrailingName(argument.Expression) == RequestArgumentName
            );

            if (!hasRequestArgument)
            {
                continue;
            }

            yield return new CSharpApiMatch(
                file.RelativePath,
                file.GetLine(invokedName),
                $"{UpdateBinaryDataMethodName}(.., {RequestArgumentName}, ..)"
            );
        }
    }

    private static string? TrailingName(ExpressionSyntax expression) =>
        expression switch
        {
            SimpleNameSyntax simple => simple.Identifier.Text,
            MemberAccessExpressionSyntax memberAccess => memberAccess.Name.Identifier.Text,
            _ => null,
        };
}
