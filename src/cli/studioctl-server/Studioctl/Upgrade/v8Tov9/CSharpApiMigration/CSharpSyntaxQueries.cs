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
            // handled by MemberReferences/InvokedMethods and are not type references. A qualified type
            // in EXPRESSION position is the exception: `Models.SomeEnum.Member` parses as nested member
            // accesses, so `SomeEnum` is a `.Name` even though it is the type being referenced. It is
            // distinguishable by being the receiver of a further member access.
            if (
                name.Parent is MemberAccessExpressionSyntax memberAccess
                && memberAccess.Name == name
                && !(memberAccess.Parent is MemberAccessExpressionSyntax outer && outer.Expression == memberAccess)
            )
            {
                continue;
            }

            // Skip the base type's own name - TypesImplementing owns that. A removed type used as a
            // generic type ARGUMENT in a base list (e.g. `: SomeBase<IProcessTaskEnd>`) is not
            // resolved by TypesImplementing (which only sees the outer name) and must be reported here.
            if (IsBaseTypeOwnName(name))
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
            var invokedName = InvokedName(invocation);

            if (invokedName is not null && methodSimpleNames.Contains(invokedName.Identifier.Text))
            {
                yield return new CSharpApiMatch(
                    file.RelativePath,
                    file.GetLine(invokedName),
                    invokedName.Identifier.Text
                );
            }
        }
    }

    /// <summary>
    /// Invocations <c>Receiver.Method(...)</c> where the receiver's trailing simple name is
    /// <paramref name="receiverSimpleName"/> and the method name is in
    /// <paramref name="methodNames"/>. Use for method names too generic to match bare (e.g. the
    /// removed <c>ServiceTaskResult.Failed(...)</c> factory, where matching any <c>Failed(...)</c>
    /// call would over-report unrelated code).
    /// </summary>
    public static IEnumerable<CSharpApiMatch> InvokedMethodsOn(
        ScannedCSharpFile file,
        string receiverSimpleName,
        IReadOnlySet<string> methodNames
    )
    {
        foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (
                invocation.Expression is MemberAccessExpressionSyntax memberAccess
                && methodNames.Contains(memberAccess.Name.Identifier.Text)
                && TrailingName(memberAccess.Expression) == receiverSimpleName
            )
            {
                yield return new CSharpApiMatch(
                    file.RelativePath,
                    file.GetLine(memberAccess.Name),
                    $"{receiverSimpleName}.{memberAccess.Name.Identifier.Text}"
                );
            }
        }
    }

    /// <summary>
    /// Invocations of <paramref name="methodName"/> (member-access or bare) carrying exactly
    /// <paramref name="argumentCount"/> arguments. Use when only one arity of a still-existing
    /// method was removed (e.g. the single-argument <c>SendEFormidlingShipment(Instance)</c>).
    /// </summary>
    public static IEnumerable<CSharpApiMatch> InvokedMethodsWithArity(
        ScannedCSharpFile file,
        string methodName,
        int argumentCount
    )
    {
        foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var invokedName = InvokedName(invocation);

            if (invokedName?.Identifier.Text == methodName && invocation.ArgumentList.Arguments.Count == argumentCount)
            {
                yield return new CSharpApiMatch(
                    file.RelativePath,
                    file.GetLine(invokedName),
                    $"{methodName}({argumentCount} arg)"
                );
            }
        }
    }

    /// <summary>
    /// Declarations of a method named <paramref name="methodName"/> with exactly
    /// <paramref name="parameterCount"/> parameters - an app still implementing a removed overload
    /// shape.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> MethodDeclarations(
        ScannedCSharpFile file,
        string methodName,
        int parameterCount
    )
    {
        foreach (var method in file.Root.DescendantNodes().OfType<MethodDeclarationSyntax>())
        {
            if (method.Identifier.Text == methodName && method.ParameterList.Parameters.Count == parameterCount)
            {
                yield return new CSharpApiMatch(
                    file.RelativePath,
                    file.GetLine(method),
                    $"{methodName}({parameterCount} param)"
                );
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
                yield return new CSharpApiMatch(
                    file.RelativePath,
                    file.GetLine(access.Name),
                    access.Name.Identifier.Text
                );
            }
        }
    }

    /// <summary>
    /// Assignments inside an object initializer <c>new T { Member = ... }</c> where <c>T</c>'s simple
    /// name is in <paramref name="typeSimpleNames"/> and <c>Member</c> is in
    /// <paramref name="memberNames"/>. Use for removed properties whose names are too generic to match
    /// on their own (e.g. <c>Sender</c>, <c>IsReserved</c>): pairing the member with the constructed
    /// type keeps the match precise without a semantic model.
    /// <see cref="CSharpApiMatch.Symbol"/> is <c>"&lt;TypeName&gt;.&lt;MemberName&gt;"</c>.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> ObjectInitializerMembers(
        ScannedCSharpFile file,
        IReadOnlySet<string> typeSimpleNames,
        IReadOnlySet<string> memberNames
    )
    {
        foreach (var creation in file.Root.DescendantNodes().OfType<BaseObjectCreationExpressionSyntax>())
        {
            var typeName = ConstructedTypeName(creation);
            if (typeName is null || !typeSimpleNames.Contains(typeName) || creation.Initializer is null)
            {
                continue;
            }

            foreach (var expression in creation.Initializer.Expressions)
            {
                if (
                    expression is AssignmentExpressionSyntax assignment
                    && assignment.Left is IdentifierNameSyntax member
                    && memberNames.Contains(member.Identifier.Text)
                )
                {
                    yield return new CSharpApiMatch(
                        file.RelativePath,
                        file.GetLine(assignment),
                        $"{typeName}.{member.Identifier.Text}"
                    );
                }
            }
        }
    }

    /// <summary>
    /// Object creations <c>new T(..)</c> where <c>T</c>'s simple name is in
    /// <paramref name="typeSimpleNames"/> and the argument at <paramref name="argumentIndex"/> is a
    /// lambda or anonymous method. Use to single out a removed delegate-taking constructor overload
    /// from a surviving overload of the same arity: a lambda cannot bind to a non-delegate parameter,
    /// so this reports the removed shape without over-reporting already-migrated call sites.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> ObjectCreationsWithLambdaArgument(
        ScannedCSharpFile file,
        IReadOnlySet<string> typeSimpleNames,
        int argumentIndex
    )
    {
        foreach (var creation in file.Root.DescendantNodes().OfType<BaseObjectCreationExpressionSyntax>())
        {
            var typeName = ConstructedTypeName(creation);
            if (typeName is null || !typeSimpleNames.Contains(typeName))
            {
                continue;
            }

            var arguments = creation.ArgumentList?.Arguments;
            if (arguments is null || arguments.Value.Count <= argumentIndex)
            {
                continue;
            }

            if (arguments.Value[argumentIndex].Expression is AnonymousFunctionExpressionSyntax)
            {
                yield return new CSharpApiMatch(
                    file.RelativePath,
                    file.GetLine(creation),
                    $"new {typeName}(.., lambda)"
                );
            }
        }
    }

    /// <summary>
    /// Object creations <c>new T(..)</c> where <c>T</c>'s simple name is in
    /// <paramref name="typeSimpleNames"/> and the argument at <paramref name="argumentIndex"/> does not
    /// mention <paramref name="expectedTypeName"/>. Use as a last resort for a removed constructor
    /// overload whose surviving sibling has the same arity: without a semantic model an argument held in
    /// a variable cannot be typed, so this reports it and accepts that an already-migrated call site
    /// passing the surviving type through a variable is reported too.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> ObjectCreationsWithoutExpectedTypeInArgument(
        ScannedCSharpFile file,
        IReadOnlySet<string> typeSimpleNames,
        int argumentIndex,
        string expectedTypeName
    )
    {
        foreach (var creation in file.Root.DescendantNodes().OfType<BaseObjectCreationExpressionSyntax>())
        {
            var typeName = ConstructedTypeName(creation);
            if (typeName is null || !typeSimpleNames.Contains(typeName))
            {
                continue;
            }

            var arguments = creation.ArgumentList?.Arguments;
            if (arguments is null || arguments.Value.Count <= argumentIndex)
            {
                continue;
            }

            var argument = arguments.Value[argumentIndex].Expression;

            // A lambda is already covered precisely by ObjectCreationsWithLambdaArgument.
            if (argument is AnonymousFunctionExpressionSyntax)
            {
                continue;
            }

            if (
                argument
                    .DescendantNodesAndSelf()
                    .OfType<SimpleNameSyntax>()
                    .Any(name => name.Identifier.Text == expectedTypeName)
            )
            {
                continue;
            }

            yield return new CSharpApiMatch(
                file.RelativePath,
                file.GetLine(creation),
                $"new {typeName}(.., {argument})"
            );
        }
    }

    /// <summary>
    /// The simple name of the type an object creation constructs. For a target-typed <c>new()</c> the
    /// creation itself carries no type, so the written-out type of the enclosing variable, field or
    /// property declaration is used instead — <c>CorrespondenceNotificationRecipient x = new() { .. }</c>
    /// is ordinary modern C# and must not be missed.
    /// </summary>
    public static string? ConstructedTypeName(BaseObjectCreationExpressionSyntax creation)
    {
        if (creation is ObjectCreationExpressionSyntax explicitCreation)
        {
            return SimpleName(explicitCreation.Type);
        }

        for (SyntaxNode? node = creation.Parent; node is not null; node = node.Parent)
        {
            switch (node)
            {
                case VariableDeclarationSyntax variable:
                    return SimpleName(variable.Type);
                case PropertyDeclarationSyntax property:
                    return SimpleName(property.Type);
                case ParameterSyntax parameter:
                    return SimpleName(parameter.Type);
                // Stop at the first construct that decides the target type, so an unrelated outer
                // declaration cannot be mistaken for this creation's type.
                case AssignmentExpressionSyntax:
                case ArgumentSyntax:
                case ReturnStatementSyntax:
                case ArrowExpressionClauseSyntax:
                case InitializerExpressionSyntax:
                    return null;
            }
        }

        return null;
    }

    /// <summary>
    /// <c>using</c> directives naming <paramref name="namespacePrefix"/> or a namespace nested under it.
    /// Unlike the name-based queries above this is exact rather than heuristic - a using directive
    /// carries the full namespace - which makes it the reliable way to spot a whole package's surface
    /// (e.g. <c>Altinn.ApiClients.Maskinporten</c>) without enumerating every type in it. Aliased usings
    /// (<c>using X = A.B;</c>) count: the namespace is still referenced.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> UsingNamespaces(ScannedCSharpFile file, string namespacePrefix)
    {
        foreach (var directive in file.Root.DescendantNodes().OfType<UsingDirectiveSyntax>())
        {
            if (directive.Name?.ToString() is not { } name)
            {
                continue;
            }

            var comparable = WithoutGlobalAlias(name);
            var isPrefixMatch =
                comparable.Equals(namespacePrefix, StringComparison.Ordinal)
                || comparable.StartsWith(namespacePrefix + ".", StringComparison.Ordinal);

            if (isPrefixMatch)
            {
                yield return new CSharpApiMatch(file.RelativePath, file.GetLine(directive), $"using {name}");
            }
        }
    }

    /// <summary>
    /// <c>using</c> directives naming <paramref name="namespacePrefix"/> that the namespace rewrite
    /// leaves alone, so a human still has to change them. Two forms qualify: an aliased directive
    /// (<c>using X = A.B;</c>), which the rewrite skips outright, and one written with
    /// <c>global::</c>, which its exact-name comparison never matches.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> UnrewritableUsingNamespaces(
        ScannedCSharpFile file,
        string namespacePrefix
    )
    {
        foreach (var directive in file.Root.DescendantNodes().OfType<UsingDirectiveSyntax>())
        {
            if (directive.Name?.ToString() is not { } name)
            {
                continue;
            }

            var isGlobalQualified = name.StartsWith("global::", StringComparison.Ordinal);
            if (directive.Alias is null && !isGlobalQualified)
            {
                continue;
            }

            var comparable = WithoutGlobalAlias(name);
            if (
                comparable.Equals(namespacePrefix, StringComparison.Ordinal)
                || comparable.StartsWith(namespacePrefix + ".", StringComparison.Ordinal)
            )
            {
                var symbol = directive.Alias is null ? $"using {name}" : $"using {directive.Alias.Name} = {name}";

                yield return new CSharpApiMatch(file.RelativePath, file.GetLine(directive), symbol);
            }
        }
    }

    /// <summary>
    /// Fully-qualified references to <paramref name="namespacePrefix"/> written out in code rather than
    /// imported (<c>Altinn.Common.EFormidlingClient.IEFormidlingClient</c>). The namespace rewrite only
    /// touches <c>using</c> directives, so these survive it untouched and must be changed by hand.
    /// </summary>
    /// <remarks>
    /// Covers both positions a qualified name can appear in, because they parse differently: a type
    /// (<c>QualifiedNameSyntax</c>, e.g. a field's declared type) and an expression
    /// (<c>MemberAccessExpressionSyntax</c>, e.g. a static call). Matching only the first would miss
    /// <c>Altinn.EFormidlingClient.Extensions.HttpClientExtension.GetAsync(...)</c> entirely.
    /// <para>
    /// Only the outermost name is reported in each case: <see cref="SyntaxNode.DescendantNodes"/> also
    /// yields the nested left-hand names, which would report the same reference several times over.
    /// Names inside <c>using</c> directives are skipped - those are already covered by
    /// <see cref="UsingNamespaces"/> and <see cref="UnrewritableUsingNamespaces"/>.
    /// </para>
    /// </remarks>
    public static IEnumerable<CSharpApiMatch> QualifiedNameReferences(ScannedCSharpFile file, string namespacePrefix)
    {
        foreach (var qualified in file.Root.DescendantNodes().OfType<QualifiedNameSyntax>())
        {
            if (
                qualified.Parent is QualifiedNameSyntax
                || qualified.FirstAncestorOrSelf<UsingDirectiveSyntax>() is not null
            )
            {
                continue;
            }

            var name = qualified.ToString();
            if (WithoutGlobalAlias(name).StartsWith(namespacePrefix + ".", StringComparison.Ordinal))
            {
                yield return new CSharpApiMatch(file.RelativePath, file.GetLine(qualified), name);
            }
        }

        foreach (var access in file.Root.DescendantNodes().OfType<MemberAccessExpressionSyntax>())
        {
            if (access.Parent is MemberAccessExpressionSyntax outer && outer.Expression == access)
            {
                continue;
            }

            var name = access.ToString();
            if (WithoutGlobalAlias(name).StartsWith(namespacePrefix + ".", StringComparison.Ordinal))
            {
                yield return new CSharpApiMatch(file.RelativePath, file.GetLine(access), name);
            }
        }
    }

    /// <summary>
    /// Strips a leading <c>global::</c> so a name can be compared against a plain namespace. Both
    /// forms mean the same namespace and the rewrite misses both alike, so both must be reported. The
    /// original spelling is what gets reported back, since that is what the reader has to find.
    /// </summary>
    private static string WithoutGlobalAlias(string name) =>
        name.StartsWith("global::", StringComparison.Ordinal) ? name["global::".Length..] : name;

    /// <summary>
    /// Whether <paramref name="name"/> is the name that identifies a base-list entry itself - the
    /// name <see cref="TypesImplementing"/> resolves and reports - as opposed to a name nested
    /// inside it (a generic type argument).
    /// </summary>
    private static bool IsBaseTypeOwnName(SimpleNameSyntax name)
    {
        var baseType = name.FirstAncestorOrSelf<BaseTypeSyntax>();
        if (baseType is null)
        {
            return false;
        }

        SyntaxNode definingName = baseType.Type switch
        {
            QualifiedNameSyntax qualified => qualified.Right,
            AliasQualifiedNameSyntax alias => alias.Name,
            var type => type,
        };

        return name == definingName;
    }

    /// <summary>
    /// The name node identifying the method an invocation calls, or <c>null</c>. Reported instead of the
    /// invocation itself so the <c>path:line</c> lands on the offending call rather than on the start of
    /// the enclosing expression - the difference matters for the multi-line fluent builder chains that
    /// dominate the Correspondence and Signing APIs.
    /// </summary>
    private static SimpleNameSyntax? InvokedName(InvocationExpressionSyntax invocation) =>
        invocation.Expression switch
        {
            MemberAccessExpressionSyntax memberAccess => memberAccess.Name,
            // Null-conditional calls (`x?.Method(...)`) bind the name via a member binding.
            MemberBindingExpressionSyntax memberBinding => memberBinding.Name,
            SimpleNameSyntax simple => simple,
            _ => null,
        };

    /// <summary>The trailing (unqualified) identifier of an expression, or <c>null</c>.</summary>
    private static string? TrailingName(ExpressionSyntax expression) =>
        expression switch
        {
            SimpleNameSyntax simple => simple.Identifier.Text,
            MemberAccessExpressionSyntax memberAccess => memberAccess.Name.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            _ => null,
        };

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
