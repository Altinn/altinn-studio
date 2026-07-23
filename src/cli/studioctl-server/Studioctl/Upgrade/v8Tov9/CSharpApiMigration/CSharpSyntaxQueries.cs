using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>A single syntactic match found in an app C# file.</summary>
/// <param name="RelativePath">File path relative to the scanned source directory.</param>
/// <param name="Line">1-based line where the match starts.</param>
/// <param name="Symbol">A short description of what matched (e.g. <c>"MyHandler : IProcessTaskEnd"</c>).</param>
internal readonly record struct CSharpApiMatch(string RelativePath, int Line, string Symbol)
{
    /// <summary>A <c>path:line</c> location string for use in warning messages.</summary>
    public string Location => $"{RelativePath}:{Line}";
}

/// <summary>
/// Reusable, syntax-only queries over <see cref="ScannedCSharpFile"/> trees, shared by the v8-&gt;v9 C#
/// API migration detectors. These match on <em>simple</em> (unqualified) names, so a fully-qualified
/// reference such as <c>Altinn.App.Core.Features.IProcessTaskEnd</c> matches the same as
/// <c>IProcessTaskEnd</c>. That is deliberate: the detectors only <em>warn</em>, so a slightly broad
/// match that occasionally over-reports is preferable to missing a real breaking usage. There is no
/// semantic model, so these cannot resolve a variable's declared type - member-name queries match on
/// the member name alone (see <see cref="MemberReferences"/>).
/// </summary>
internal static class CSharpSyntaxQueries
{
    /// <summary>
    /// Type declarations (class/record/struct/interface) whose base list names any of
    /// <paramref name="interfaceSimpleNames"/>. Used to find app types implementing a removed or
    /// changed interface. <see cref="CSharpApiMatch.Symbol"/> is <c>"&lt;TypeName&gt; : &lt;InterfaceName&gt;"</c>.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> TypesImplementing(
        ScannedCSharpFile file,
        IReadOnlySet<string> interfaceSimpleNames
    )
    {
        foreach (var type in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            if (type.BaseList is null)
            {
                continue;
            }

            foreach (var baseType in type.BaseList.Types)
            {
                var name = SimpleName(baseType.Type);
                if (name is not null && interfaceSimpleNames.Contains(name))
                {
                    yield return new CSharpApiMatch(
                        file.RelativePath,
                        file.GetLine(type),
                        $"{type.Identifier.Text} : {name}"
                    );
                }
            }
        }
    }

    /// <summary>
    /// Any reference to a type whose simple name is in <paramref name="typeSimpleNames"/>: a bare
    /// identifier, a generic name, or a type argument (so this also catches DI registrations such as
    /// <c>AddTransient&lt;IProcessTaskEnd, Foo&gt;()</c> and object creations such as
    /// <c>new ServiceTaskErrorHandling(...)</c>). Base-list occurrences are excluded so callers can
    /// combine this with <see cref="TypesImplementing"/> without double-reporting the same line.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> TypeReferences(
        ScannedCSharpFile file,
        IReadOnlySet<string> typeSimpleNames
    )
    {
        foreach (var name in file.Root.DescendantNodes().OfType<SimpleNameSyntax>())
        {
            if (!typeSimpleNames.Contains(name.Identifier.Text))
            {
                continue;
            }

            // Skip the name half of a member access (e.g. the `Member` in `X.Member`); those are
            // handled by MemberReferences/InvokedMethods and are not type references.
            if (name.Parent is MemberAccessExpressionSyntax memberAccess && memberAccess.Name == name)
            {
                continue;
            }

            // Skip base-list entries - TypesImplementing owns those.
            if (name.FirstAncestorOrSelf<BaseListSyntax>() is not null && IsInBaseType(name))
            {
                continue;
            }

            yield return new CSharpApiMatch(file.RelativePath, file.GetLine(name), name.Identifier.Text);
        }
    }

    /// <summary>
    /// Invocations of a method whose simple name is in <paramref name="methodSimpleNames"/>, e.g. the
    /// removed <c>ServiceTaskResult.FailedContinueProcessNext(...)</c> factory. Matches both
    /// <c>Type.Method(...)</c> and bare <c>Method(...)</c> call sites.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> InvokedMethods(
        ScannedCSharpFile file,
        IReadOnlySet<string> methodSimpleNames
    )
    {
        foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var invokedName = invocation.Expression switch
            {
                MemberAccessExpressionSyntax memberAccess => memberAccess.Name.Identifier.Text,
                SimpleNameSyntax simple => simple.Identifier.Text,
                _ => null,
            };

            if (invokedName is not null && methodSimpleNames.Contains(invokedName))
            {
                yield return new CSharpApiMatch(file.RelativePath, file.GetLine(invocation), invokedName);
            }
        }
    }

    /// <summary>
    /// Member accesses <c>X.member</c> where <c>member</c> is in <paramref name="memberNames"/>,
    /// regardless of what <c>X</c> is. Used for distinctive members like
    /// <c>AppSettings.EnableEFormidling</c> that cannot be resolved without a semantic model; the
    /// member name is distinctive enough that matching on it alone is an acceptable heuristic.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> MemberReferences(ScannedCSharpFile file, IReadOnlySet<string> memberNames)
    {
        foreach (var access in file.Root.DescendantNodes().OfType<MemberAccessExpressionSyntax>())
        {
            if (memberNames.Contains(access.Name.Identifier.Text))
            {
                yield return new CSharpApiMatch(file.RelativePath, file.GetLine(access), access.Name.Identifier.Text);
            }
        }
    }

    private static bool IsInBaseType(SyntaxNode node)
    {
        for (var current = node; current is not null; current = current.Parent)
        {
            if (current is BaseTypeSyntax)
            {
                return true;
            }

            if (current is BaseListSyntax)
            {
                return false;
            }
        }

        return false;
    }

    /// <summary>The trailing (unqualified) identifier of a type reference, or <c>null</c>.</summary>
    private static string? SimpleName(TypeSyntax? type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.Text,
            GenericNameSyntax generic => generic.Identifier.Text,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            NullableTypeSyntax nullable => SimpleName(nullable.ElementType),
            _ => null,
        };
}
