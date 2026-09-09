using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for <c>PlatformHttpException.Response</c> uses that the v9 snapshot cannot satisfy.
/// <para>
/// In v9 <c>Response</c> is a <c>PlatformHttpResponse</c> snapshot rather than a live
/// <c>HttpResponseMessage</c>. <c>Response.StatusCode</c> is unaffected and is deliberately not reported.
/// What this catches is the rest:
/// </para>
/// <list type="bullet">
/// <item>
/// <b>Reflection over the property.</b> The dangerous one: <c>GetProperty("Response")</c> followed by
/// <c>as HttpResponseMessage</c> keeps compiling and starts returning <c>null</c> at runtime, so a
/// status-code lookup silently falls through to whatever fallback the app wrote. No compiler
/// diagnostic will ever surface this.
/// </item>
/// <item>
/// <b>Member access other than <c>StatusCode</c>.</b> <c>Response.Content</c> was an
/// <c>HttpContent</c> and is now a <c>string</c>; <c>Response.Headers</c> was
/// <c>HttpResponseHeaders</c> and is now a dictionary. These break at compile time, but the fix is a
/// judgment call, so they are reported rather than rewritten.
/// </item>
/// <item>
/// <b>The bare property used as a value</b> — passed, returned or assigned somewhere expecting an
/// <c>HttpResponseMessage</c>.
/// </item>
/// </list>
/// </summary>
internal sealed class PlatformHttpExceptionApiDetector
{
    private const string ExceptionTypeName = "PlatformHttpException";
    private const string ResponseMemberName = "Response";
    private const string SafeMemberName = "StatusCode";
    private const string HttpResponseMessageTypeName = "HttpResponseMessage";

    /// <summary>
    /// ASP.NET receivers whose <c>.Response</c> is the framework's, not the exception's. Without a
    /// semantic model the receiver name is the only signal available, and these are the shapes that
    /// actually occur in app code (<c>HttpContext.Response.Headers</c> in a controller or middleware).
    /// </summary>
    private static readonly IReadOnlySet<string> _aspNetReceivers = new HashSet<string>(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "HttpContext",
        "context",
        "ctx",
    };

    private const string ReflectionSummary =
        "This app reaches PlatformHttpException.Response by reflection and casts it to HttpResponseMessage. "
        + "In v9 Response is a PlatformHttpResponse snapshot, so that cast yields null and the code silently "
        + "takes its fallback path - it still compiles and no test will fail unless it covers this path. "
        + "Replace the reflection with a direct read of ex.StatusCode (or ex.Response.StatusCode). Found at:";

    private const string MemberSummary =
        "PlatformHttpException.Response is a PlatformHttpResponse snapshot in v9, not a live "
        + "HttpResponseMessage. Response.StatusCode is unchanged, but Content is now a string (the body, "
        + "already read and capped at 16 KB) instead of HttpContent, and Headers is now a read-only "
        + "dictionary instead of HttpResponseHeaders. Review these uses:";

    private readonly CSharpSourceScanner _scanner;

    public PlatformHttpExceptionApiDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var reflection = new List<CSharpApiMatch>();
        var members = new List<CSharpApiMatch>();

        foreach (var file in _scanner.Files)
        {
            if (!MentionsPlatformHttpException(file))
            {
                continue;
            }

            reflection.AddRange(ReflectionOverResponse(file));
            members.AddRange(UnsupportedResponseUses(file));
        }

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(ReflectionSummary, reflection),
            WarnOnlyDetector.Report(MemberSummary, members)
        );
    }

    private static bool MentionsPlatformHttpException(ScannedCSharpFile file) =>
        file.Root.DescendantNodes().OfType<SimpleNameSyntax>().Any(n => n.Identifier.Text == ExceptionTypeName);

    /// <summary>
    /// <c>GetProperty("Response")</c> calls, plus any cast to <c>HttpResponseMessage</c>. Scoped to files
    /// that mention the exception, which keeps the cast half from firing on ordinary HTTP client code.
    /// </summary>
    private static IEnumerable<CSharpApiMatch> ReflectionOverResponse(ScannedCSharpFile file)
    {
        foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (
                invocation.Expression is MemberAccessExpressionSyntax { Name.Identifier.Text: "GetProperty" }
                && invocation.ArgumentList.Arguments.Count > 0
                && invocation.ArgumentList.Arguments[0].Expression
                    is LiteralExpressionSyntax { Token.ValueText: ResponseMemberName }
            )
            {
                yield return new CSharpApiMatch(
                    file.RelativePath,
                    file.GetLine(invocation),
                    "GetProperty(\"Response\")"
                );
            }
        }

        foreach (var node in file.Root.DescendantNodes())
        {
            string? castType = node switch
            {
                BinaryExpressionSyntax binary when binary.IsKind(SyntaxKind.AsExpression) => SimpleTypeName(
                    binary.Right as TypeSyntax
                ),
                CastExpressionSyntax cast => SimpleTypeName(cast.Type),
                _ => null,
            };

            if (castType == HttpResponseMessageTypeName)
            {
                yield return new CSharpApiMatch(file.RelativePath, file.GetLine(node), "cast to HttpResponseMessage");
            }
        }
    }

    /// <summary>
    /// <c>X.Response</c> accesses that are not the still-supported <c>X.Response.StatusCode</c>, excluding
    /// the ASP.NET <c>HttpContext.Response</c> family.
    /// </summary>
    private static IEnumerable<CSharpApiMatch> UnsupportedResponseUses(ScannedCSharpFile file)
    {
        foreach (var access in file.Root.DescendantNodes().OfType<MemberAccessExpressionSyntax>())
        {
            if (access.Name.Identifier.Text != ResponseMemberName)
            {
                continue;
            }

            var receiver = TrailingName(access.Expression);
            if (receiver is not null && _aspNetReceivers.Contains(receiver))
            {
                continue;
            }

            // `X.Response.Member` - fine when Member is StatusCode, reportable otherwise.
            if (access.Parent is MemberAccessExpressionSyntax outer && outer.Expression == access)
            {
                if (outer.Name.Identifier.Text != SafeMemberName)
                {
                    yield return new CSharpApiMatch(
                        file.RelativePath,
                        file.GetLine(outer.Name),
                        $"Response.{outer.Name.Identifier.Text}"
                    );
                }

                continue;
            }

            // Bare `X.Response` used as a value.
            yield return new CSharpApiMatch(file.RelativePath, file.GetLine(access.Name), "Response");
        }
    }

    private static string? TrailingName(ExpressionSyntax expression) =>
        expression switch
        {
            SimpleNameSyntax simple => simple.Identifier.Text,
            MemberAccessExpressionSyntax memberAccess => memberAccess.Name.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            _ => null,
        };

    private static string? SimpleTypeName(TypeSyntax? type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.Text,
            GenericNameSyntax generic => generic.Identifier.Text,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            NullableTypeSyntax nullable => SimpleTypeName(nullable.ElementType),
            _ => null,
        };
}
