using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>The v8 clients whose calls reach Platform Storage.</summary>
internal enum StorageClient
{
    Data,
    Instance,
    DataService,
    Pdf,
}

/// <summary>How the code around a call uses what it returns.</summary>
internal enum CallUseKind
{
    /// <summary>The call, awaited or not, is a statement of its own.</summary>
    Statement,

    /// <summary><c>_ = await call;</c></summary>
    Discard,

    /// <summary><c>var x = await call;</c>, the only variable of its declaration.</summary>
    Declaration,

    /// <summary><c>x = await call;</c> as a statement.</summary>
    Assignment,

    /// <summary>Returned from the method, by <c>return</c> or an expression body.</summary>
    Return,

    /// <summary>Anything else: an argument, a member access, a condition.</summary>
    Expression,
}

/// <summary>
/// How a call's result is used: <see cref="Call"/> is the call with its <c>.ConfigureAwait(…)</c>, <see cref="Outer"/>
/// that with what waits for it (<c>await</c>, <c>.Result</c>, <c>.GetAwaiter().GetResult()</c>), and
/// <see cref="Statement"/> the statement it is in.
/// </summary>
internal sealed record CallUse(
    CallUseKind Kind,
    ExpressionSyntax Call,
    ExpressionSyntax Outer,
    StatementSyntax? Statement,
    bool Awaited,
    ISymbol? Target
);

/// <summary>
/// A call of a v8 Storage client member, bound through the compilation: on the client interface, on an Altinn
/// implementation of it, or an extension method on it. Arguments are found by the names v8 gives the parameters,
/// which every v8 version keeps.
/// </summary>
internal sealed class StorageClientCall
{
    private static readonly Dictionary<string, StorageClient> _clients = new(StringComparer.Ordinal)
    {
        ["Altinn.App.Core.Internal.Data.IDataClient"] = StorageClient.Data,
        ["Altinn.App.Core.Internal.Instances.IInstanceClient"] = StorageClient.Instance,
        ["Altinn.App.Core.Internal.Data.IDataService"] = StorageClient.DataService,
        ["Altinn.App.Core.Internal.Pdf.IPdfService"] = StorageClient.Pdf,
    };

    private StorageClientCall(
        IInvocationOperation invocation,
        InvocationExpressionSyntax syntax,
        StorageClient client,
        IMethodSymbol method
    )
    {
        Invocation = invocation;
        Syntax = syntax;
        Client = client;
        Method = method;
        Use = UseOf(invocation);
    }

    public IInvocationOperation Invocation { get; }

    public InvocationExpressionSyntax Syntax { get; }

    public StorageClient Client { get; }

    /// <summary>The member called, an extension method in its static form.</summary>
    public IMethodSymbol Method { get; }

    public CallUse Use { get; }

    public string Name => Method.Name;

    /// <summary>The member as reports name it, such as <c>IDataClient.UpdateData</c>.</summary>
    public string DisplayName => $"{ClientName(Client)}.{Name}";

    public static string ClientName(StorageClient client) =>
        client switch
        {
            StorageClient.Data => "IDataClient",
            StorageClient.Instance => "IInstanceClient",
            StorageClient.DataService => "IDataService",
            _ => "IPdfService",
        };

    /// <summary>The call, when <paramref name="invocation"/> calls a member of a v8 Storage client.</summary>
    public static StorageClientCall? From(IInvocationOperation invocation)
    {
        if (invocation.Syntax is not InvocationExpressionSyntax syntax)
        {
            return null;
        }

        var method = (invocation.TargetMethod.ReducedFrom ?? invocation.TargetMethod).OriginalDefinition;
        return ClientOf(method) is { } client ? new StorageClientCall(invocation, syntax, client, method) : null;
    }

    /// <summary>The client <paramref name="method"/> belongs to, for a member Altinn declares.</summary>
    public static StorageClient? ClientOf(IMethodSymbol method)
    {
        if (!CSharpSemanticQueries.IsAltinnAppSymbol(method))
        {
            return null;
        }

        if (method is { IsExtensionMethod: true, Parameters: [var extended, ..] })
        {
            return ClientTypeOf(extended.Type);
        }

        return ClientTypeOf(method.ContainingType);
    }

    /// <summary>The client <paramref name="type"/> is or implements, for an Altinn client interface.</summary>
    public static StorageClient? ClientTypeOf(ITypeSymbol type)
    {
        if (_clients.TryGetValue(type.OriginalDefinition.ToDisplayString(), out var client))
        {
            return client;
        }

        foreach (var contract in type.AllInterfaces)
        {
            if (
                _clients.TryGetValue(contract.OriginalDefinition.ToDisplayString(), out var implemented)
                && CSharpSemanticQueries.IsAltinnAppSymbol(contract)
            )
            {
                return implemented;
            }
        }

        return null;
    }

    /// <summary>The argument for the parameter with one of <paramref name="names"/>, written or defaulted.</summary>
    public IArgumentOperation? Argument(params string[] names) =>
        Invocation.Arguments.FirstOrDefault(argument =>
            argument.Parameter is { } parameter && names.Contains(parameter.Name, StringComparer.Ordinal)
        );

    /// <summary>The argument the code writes for the parameter, or <c>null</c> when it is left to its default.</summary>
    public IArgumentOperation? Written(params string[] names) =>
        Argument(names) is { ArgumentKind: not ArgumentKind.DefaultValue } argument ? argument : null;

    /// <summary>
    /// The written argument expression for a parameter, without its <c>name:</c>; the receiver of an extension method
    /// called on it.
    /// </summary>
    public static ExpressionSyntax? Expression(IArgumentOperation? argument) =>
        argument
            ?.Syntax.AncestorsAndSelf()
            .TakeWhile(static node => node is not InvocationExpressionSyntax)
            .OfType<ArgumentSyntax>()
            .FirstOrDefault()
            is { } written
            ? written.Expression
            : argument?.Syntax as ExpressionSyntax;

    private static CallUse UseOf(IInvocationOperation invocation)
    {
        var call = (ExpressionSyntax)invocation.Syntax;
        ExpressionSyntax outer = call;
        if (
            outer.Parent is MemberAccessExpressionSyntax { Name.Identifier.ValueText: "ConfigureAwait" } configure
            && configure.Parent is InvocationExpressionSyntax configured
        )
        {
            outer = configured;
        }

        // The call as the rewrite replaces it: a ConfigureAwait goes with the client call it was for.
        call = outer;
        var awaited = false;
        switch (outer.Parent)
        {
            case AwaitExpressionSyntax awaitExpression:
                outer = awaitExpression;
                awaited = true;
                break;
            case MemberAccessExpressionSyntax { Name.Identifier.ValueText: "Result" } result:
                outer = result;
                awaited = true;
                break;
            case MemberAccessExpressionSyntax { Name.Identifier.ValueText: "GetAwaiter" } awaiter
                when awaiter.Parent
                    is InvocationExpressionSyntax
                    {
                        Parent: MemberAccessExpressionSyntax { Name.Identifier.ValueText: "GetResult" } getResult,
                    }
                    && getResult.Parent is InvocationExpressionSyntax blocking:
                outer = blocking;
                awaited = true;
                break;
        }

        var statement = outer.FirstAncestorOrSelf<StatementSyntax>();
        var model = invocation.SemanticModel;
        return outer.Parent switch
        {
            ExpressionStatementSyntax expressionStatement => new(
                CallUseKind.Statement,
                call,
                outer,
                expressionStatement,
                awaited,
                null
            ),
            AssignmentExpressionSyntax { Parent: ExpressionStatementSyntax assignmentStatement } assignment
                when assignment.IsKind(SyntaxKind.SimpleAssignmentExpression) && assignment.Right == outer =>
                model?.GetOperation(assignment.Left) is IDiscardOperation
                    ? new(CallUseKind.Discard, call, outer, assignmentStatement, awaited, null)
                    : new(
                        CallUseKind.Assignment,
                        call,
                        outer,
                        assignmentStatement,
                        awaited,
                        model?.GetSymbolInfo(assignment.Left).Symbol
                    ),
            EqualsValueClauseSyntax
            {
                Parent: VariableDeclaratorSyntax
                {
                    Parent: VariableDeclarationSyntax
                    {
                        Variables.Count: 1,
                        Parent: LocalDeclarationStatementSyntax declarationStatement,
                    },
                } declarator,
            } when declarationStatement.UsingKeyword.IsKind(SyntaxKind.None) => new(
                CallUseKind.Declaration,
                call,
                outer,
                declarationStatement,
                awaited,
                model?.GetDeclaredSymbol(declarator)
            ),
            ReturnStatementSyntax or ArrowExpressionClauseSyntax => new(
                CallUseKind.Return,
                call,
                outer,
                statement,
                awaited,
                null
            ),
            _ => new(CallUseKind.Expression, call, outer, statement, awaited, null),
        };
    }
}
