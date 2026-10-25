using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// What the code the process transition runs does that the rewrite cannot move, or moves with a consequence the app
/// owner must know: reads of the caller's identity, request language, package code, pre-claim writes, catches around
/// moved writes, code the call graph did not follow, and service tasks whose moved writes a failure throws away.
/// </summary>
internal static class WindowReports
{
    private const string AuthenticationContext = "Altinn.App.Core.Features.Auth.IAuthenticationContext";
    private const string HttpContextAccessor = "Microsoft.AspNetCore.Http.IHttpContextAccessor";
    private const string HttpContext = "Microsoft.AspNetCore.Http.HttpContext";

    private static readonly HashSet<string> _validators =
    [
        "Altinn.App.Core.Features.Validation.IInstanceValidator",
        "Altinn.App.Core.Features.IInstanceValidator",
        "Altinn.App.Core.Features.ITaskValidator",
        "Altinn.App.Core.Features.IDataElementValidator",
        "Altinn.App.Core.Features.IFormDataValidator",
        "Altinn.App.Core.Features.IValidator",
        "Altinn.App.Core.Features.IProcessExclusiveGateway",
    ];

    private static readonly HashSet<string> _writes =
    [
        "InsertFormData",
        "UpdateData",
        "UpdateFormData",
        "DeleteData",
        "InsertBinaryData",
        "UpdateBinaryData",
        "Update",
        "LockDataElement",
        "UnlockDataElement",
        "UpdateProcess",
        "UpdateProcessAndEvents",
        "CreateInstance",
        "AddCompleteConfirmation",
        "UpdateSubstatus",
        "UpdatePresentationTexts",
        "UpdateDataValues",
        "UpdateDataValue",
        "DeleteBinaryData",
        "DeleteInstance",
        "InsertJsonObject",
        "UpdateJsonObject",
        "DeleteById",
    ];

    /// <summary>Whether the call writes to Storage.</summary>
    public static bool IsWrite(StorageClientCall call) => _writes.Contains(call.Name);

    /// <summary>C-LANG and P-IDENTITY in one method the transition runs.</summary>
    /// <param name="callbackActorIsKnown">
    /// Whether the app's libraries put the actor who started a transition on the contexts of hooks, service tasks and
    /// <c>DataCreation</c>; until then the caller's identity is not available in a hook.
    /// </param>
    public static void Plan(MethodRewrite rewrite, CurrentInstanceFlow flow, bool callbackActorIsKnown)
    {
        foreach (var operation in rewrite.Body.Operation.DescendantsAndSelf())
        {
            switch (operation)
            {
                case IPropertyReferenceOperation { Property.Name: "HttpContext" } httpContext
                    when IsHttpContextAccessor(httpContext.Instance?.Type):
                    HttpContextRead(rewrite, httpContext, "HttpContext", callbackActorIsKnown);
                    break;
                // The accessor's HttpContext kept in a field or property in the constructor, which the reach does not see.
                case IFieldReferenceOperation field
                    when IsHttpContext(field.Type) && MemberName(field.Syntax) is not null:
                    HttpContextRead(rewrite, field, field.Field.Name, callbackActorIsKnown);
                    break;
                case IPropertyReferenceOperation property
                    when IsHttpContext(property.Type)
                        && IsAutoProperty(property.Property)
                        && MemberName(property.Syntax) is not null:
                    HttpContextRead(rewrite, property, property.Property.Name, callbackActorIsKnown);
                    break;
                case IInvocationOperation http when IsHttpCall(http):
                    HttpCall(rewrite, http);
                    break;
                case IPropertyReferenceOperation { Property.Name: "Current" } current
                    when current.Property.ContainingType.OriginalDefinition.ToDisplayString() == AuthenticationContext
                        && rewrite.InCallback:
                    Identity(
                        rewrite,
                        current.Syntax,
                        "IAuthenticationContext.Current",
                        CallerRead.Caller,
                        callbackActorIsKnown
                    );
                    break;
                case IInvocationOperation
                {
                    TargetMethod.Name: "Add" or "Remove" or "RemoveAll" or "Insert" or "Clear"
                } edit
                    when edit.Instance is IPropertyReferenceOperation { Property.Name: "Data" } data
                        && flow.Evaluate(data.Instance) is { IsCurrent: true, Part: InstancePart.Instance }
                        && !rewrite.Edits.Rewrites(edit.Syntax)
                        && rewrite
                            .Body.Operation.DescendantsAndSelf()
                            .OfType<IInvocationOperation>()
                            .Any(static invocation => StorageClientCall.From(invocation) is not null):
                    rewrite.Warn(
                        edit.Syntax,
                        "this changes instance.Data by hand; the mutator's Instance is the engine's view, and the change is not saved."
                    );
                    break;
            }
        }
    }

    private static bool IsHttpCall(IInvocationOperation invocation)
    {
        var method = invocation.TargetMethod.ReducedFrom ?? invocation.TargetMethod;
        var receiver = method is { IsExtensionMethod: true, Parameters: [var extended, ..] }
            ? extended.Type
            : method.ContainingType;
        return method.Name is "GetAsync" or "PostAsync" or "PutAsync" or "PatchAsync" or "DeleteAsync" or "SendAsync"
            && IsHttpClient(receiver);
    }

    private static bool IsHttpClient(ITypeSymbol? type)
    {
        for (var current = type; current is not null; current = current.BaseType)
        {
            if (current.ToDisplayString() == "System.Net.Http.HttpClient")
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// C-XH and C-XO for raw HTTP: a request from a type that points its client at Storage's API, or one to another
    /// app's instances; other requests go to external APIs and stay as they are.
    /// </summary>
    private static void HttpCall(MethodRewrite rewrite, IInvocationOperation http)
    {
        var type = http.Syntax.FirstAncestorOrSelf<TypeDeclarationSyntax>();
        var method = http.Syntax.FirstAncestorOrSelf<MemberDeclarationSyntax>();
        if (type is null || method is null)
        {
            return;
        }

        var member = $"HttpClient.{http.TargetMethod.Name}";
        if (
            type.DescendantNodes()
                .OfType<IdentifierNameSyntax>()
                .Any(static name => name.Identifier.ValueText == "ApiStorageEndpoint")
        )
        {
            rewrite.Todo(
                http.Syntax,
                $"{member} calls Storage over HTTP; use the mutator, with OverrideAuthenticationMethod for a data type "
                    + "that needs the service owner's token."
            );
            return;
        }

        if (
            method
                .DescendantTokens()
                .Any(static token => token.ValueText.Contains("/instances", StringComparison.Ordinal))
        )
        {
            rewrite.Todo(
                http.Syntax,
                $"{member} writes to another instance (through an app's instances API) from a process hook. The mutator "
                    + "covers only this instance, and the step may run more than once: make the call idempotent or move it "
                    + "out of the transition."
            );
        }
    }

    private static bool IsHttpContextAccessor(ITypeSymbol? type) =>
        type is not null
        && (
            type.OriginalDefinition.ToDisplayString() == HttpContextAccessor
            || type.AllInterfaces.Any(static i => i.ToDisplayString() == HttpContextAccessor)
        );

    private static bool IsHttpContext(ITypeSymbol? type) => type?.OriginalDefinition.ToDisplayString() == HttpContext;

    /// <summary>A property the app declares without code in its getter, which holds what was set like a field.</summary>
    private static bool IsAutoProperty(IPropertySymbol property) =>
        property.DeclaringSyntaxReferences is [var reference]
        && reference.GetSyntax()
            is PropertyDeclarationSyntax { ExpressionBody: null, AccessorList.Accessors: var accessors }
        && accessors.All(static accessor => accessor.Body is null && accessor.ExpressionBody is null);

    /// <summary>
    /// C-LANG: <c>HttpContext?.Request.Query["language"]</c> (with <c>.FirstOrDefault()</c> or <c>.ToString()</c>)
    /// becomes the mutator's language; anything else read from the request in a callback is P-IDENTITY, except
    /// what a callback request has too.
    /// </summary>
    /// <param name="name">How the code names the <c>HttpContext</c>, for the report.</param>
    private static void HttpContextRead(
        MethodRewrite rewrite,
        IOperation httpContext,
        string name,
        bool callbackActorIsKnown
    )
    {
        if (LanguageQuery(httpContext) is { } language)
        {
            var mutator = Piece.Fixed(rewrite.MutatorExpression());
            rewrite.Replace(language, Piece.Expression("$0.Language", mutator));
            rewrite.Moved(
                language,
                $"the request's language query now comes from {rewrite.Mutator}.Language, the language of the user who moved the process on."
            );
            return;
        }

        var member = MemberName(httpContext.Syntax);
        if (!rewrite.InCallback || member is "RequestAborted" or "RequestServices" or "TraceIdentifier")
        {
            return;
        }

        Identity(
            rewrite,
            httpContext.Syntax,
            member is null ? name : $"{name}.{member}",
            member == "User" ? CallerRead.Caller : CallerRead.Request,
            callbackActorIsKnown
        );
    }

    /// <summary>
    /// The member read on <c>HttpContext</c>, as <c>User</c> in <c>HttpContext.User</c> or <c>HttpContext?.User.Identity</c>;
    /// <c>null</c> when the code uses the <c>HttpContext</c> itself.
    /// </summary>
    private static string? MemberName(SyntaxNode httpContext)
    {
        ExpressionSyntax? read = httpContext.Parent switch
        {
            MemberAccessExpressionSyntax access when access.Expression == httpContext => access,
            ConditionalAccessExpressionSyntax conditional when conditional.Expression == httpContext =>
                conditional.WhenNotNull,
            _ => null,
        };
        while (true)
        {
            switch (read)
            {
                case MemberAccessExpressionSyntax access when access.Expression == httpContext:
                    return access.Name.Identifier.ValueText;
                case MemberBindingExpressionSyntax binding:
                    return binding.Name.Identifier.ValueText;
                case ConditionalAccessExpressionSyntax inner:
                    read = inner.Expression;
                    continue;
                case MemberAccessExpressionSyntax access:
                    read = access.Expression;
                    continue;
                case InvocationExpressionSyntax invocation:
                    read = invocation.Expression;
                    continue;
                case ElementAccessExpressionSyntax element:
                    read = element.Expression;
                    continue;
                default:
                    return null;
            }
        }
    }

    /// <summary>
    /// The whole language read: the access chain from <c>HttpContext</c> through <c>Request.Query["language"]</c>, ending
    /// in <c>.FirstOrDefault()</c> or <c>.ToString()</c>, or where it converts to a string.
    /// </summary>
    private static ExpressionSyntax? LanguageQuery(IOperation httpContext)
    {
        var chain = (ExpressionSyntax)httpContext.Syntax;
        while (chain.Parent is ExpressionSyntax parent && Continues(parent, chain))
        {
            chain = parent;
        }

        var text = chain.ToString().Replace("?", "", StringComparison.Ordinal);
        var query = text.IndexOf(".Request.Query[\"language\"]", StringComparison.Ordinal);
        if (query < 0)
        {
            return null;
        }

        var rest = text[(query + ".Request.Query[\"language\"]".Length)..];
        if (rest is ".FirstOrDefault()" or ".ToString()")
        {
            return chain;
        }

        return
            rest.Length == 0
            && chain.Parent
                is EqualsValueClauseSyntax
                    or ArgumentSyntax
                    or BinaryExpressionSyntax { RawKind: (int)SyntaxKind.CoalesceExpression }
            ? chain
            : null;
    }

    /// <summary>Whether <paramref name="parent"/> goes on with the access chain <paramref name="chain"/>.</summary>
    private static bool Continues(ExpressionSyntax parent, ExpressionSyntax chain) =>
        parent switch
        {
            MemberAccessExpressionSyntax access => access.Expression == chain,
            ElementAccessExpressionSyntax element => element.Expression == chain,
            InvocationExpressionSyntax invocation => invocation.Expression == chain,
            ConditionalAccessExpressionSyntax conditional => conditional.Expression == chain
                || conditional.WhenNotNull == chain,
            _ => false,
        };

    /// <summary>What a read of the caller in a callback asks for.</summary>
    private enum CallerRead
    {
        /// <summary>Who the caller is: <c>IAuthenticationContext.Current</c>, or the request's user and claims.</summary>
        Caller,

        /// <summary>The request itself: headers, cookies, query values, the token, or the <c>HttpContext</c> passed on.</summary>
        Request,
    }

    /// <summary>
    /// P-IDENTITY: the report on a read of who moved the process on or of their request. Once the app's libraries put
    /// the actor on the contexts (#21487), a read of the caller points there, and the request itself stays the
    /// engine's either way.
    /// </summary>
    private static void Identity(
        MethodRewrite rewrite,
        SyntaxNode node,
        string what,
        CallerRead read,
        bool callbackActorIsKnown
    )
    {
        var hook = rewrite.Entry.Name;
        const string readTheActor =
            "read who started the transition from the Actor on the context that v9 hooks, service tasks and "
            + "IInstantiationProcessor.DataCreation(DataCreationContext) get";
        var text = (read, callbackActorIsKnown) switch
        {
            (CallerRead.Request, _) =>
                $"reads {what} in {hook}. v9 runs the hook in the workflow engine's callback request, which has none "
                    + "of the caller's cookies, headers, query values or token. Store what the hook needs in the data "
                    + "model before the transition, for example in a data processor, and read it from there.",
            (_, false) => $"reads {what} in {hook}. In v9 the hook runs in the workflow engine's callback, where "
                + "IAuthenticationContext.Current is the app itself and the HTTP request is the engine's, so the user who "
                + "moved the process on is not available. This is a gap in the v9 app libraries, not in your code; "
                + $"keep this code until a release closes it, then {readTheActor}.",
            (_, true) => $"reads {what} in {hook}. v9 runs the hook in the workflow engine's callback, where "
                + "IAuthenticationContext.Current is the app itself and the HTTP request is the engine's. Instead, "
                + $"{readTheActor}: UserId and NationalIdentityNumber for a user, OrgId for a service owner, SystemUserId "
                + "for a system user, AuthenticationLevel for all three, and none of them for an organization's "
                + "Maskinporten token. It does not say whether the user is in Altinn's portal, how they logged in, or "
                + "their token, scopes and parties.",
        };
        rewrite.Todo(node, text);
    }

    /// <summary>
    /// After threading: P-TRYCATCH for a moved write inside a <c>try</c> whose catches neither rethrow nor return.
    /// </summary>
    public static void AfterThreading(MethodRewrite rewrite)
    {
        foreach (var write in rewrite.MovedWrites)
        {
            var guarded = write
                .Syntax.Ancestors()
                .TakeWhile(static ancestor => ancestor is not MemberDeclarationSyntax)
                .OfType<TryStatementSyntax>()
                .FirstOrDefault(statement => statement.Block.Span.Contains(write.Syntax.Span));
            if (
                guarded is null
                || guarded.Catches.Count == 0
                || guarded.Catches.Any(static clause => Escapes(clause.Block))
            )
            {
                continue;
            }

            rewrite.Moved(
                write.Syntax,
                $"the catch around {write.DisplayName} no longer catches Storage failures: the mutator saves after the hook "
                    + "returns, and a failed save fails the step."
            );
        }
    }

    private static bool Escapes(BlockSyntax block) =>
        block
            .DescendantNodes(static node =>
                node is not (AnonymousFunctionExpressionSyntax or LocalFunctionStatementSyntax)
            )
            .Any(static node => node is ThrowStatementSyntax or ThrowExpressionSyntax or ReturnStatementSyntax);

    /// <summary>
    /// Moved writes in a service task, directly or through a helper it calls, before a failure result; v9 saves
    /// nothing from an attempt that fails. A write refused at the service task's own task is named too: moved to the
    /// mutator, it would be lost the same way.
    /// </summary>
    public static IEnumerable<PortReport> ServiceTaskFailures(
        IEnumerable<MethodRewrite> rewrites,
        IReadOnlyList<WindowEntry> entries
    )
    {
        var byMethod = rewrites.ToDictionary<MethodRewrite, IMethodSymbol, MethodRewrite>(
            static rewrite => rewrite.Method,
            static rewrite => rewrite,
            SymbolEqualityComparer.Default
        );
        foreach (var entry in entries.Where(static entry => entry.Kind == WindowEntryKind.ServiceTask))
        {
            if (!byMethod.TryGetValue(entry.Method, out var own))
            {
                continue;
            }

            var points = SavedWrites(own)
                .Select(static write => (Node: (SyntaxNode)write.Syntax, write.DisplayName))
                .ToList();
            foreach (
                var helper in byMethod.Values.Where(rewrite =>
                    rewrite != own && SavedWrites(rewrite).Any() && rewrite.Entries.Contains(entry)
                )
            )
            {
                foreach (var invocation in entry.Declaration.DescendantNodes().OfType<InvocationExpressionSyntax>())
                {
                    if (
                        entry.File.SemanticModel?.GetSymbolInfo(invocation).Symbol is IMethodSymbol called
                        && SymbolEqualityComparer.Default.Equals(called.OriginalDefinition, helper.Method)
                    )
                    {
                        points.AddRange(
                            SavedWrites(helper).Select(write => ((SyntaxNode)invocation, write.DisplayName))
                        );
                    }
                }
            }

            foreach (var (node, member) in points.DistinctBy(static point => (point.Node.SpanStart, point.DisplayName)))
            {
                if (ServiceTaskBodies.FailuresAfter(entry, node).Any())
                {
                    yield return PortReport.Located(
                        entry.File,
                        node,
                        UpgradeMessageStatus.Warning,
                        $"{member} is saved only if the service task succeeds: v9 keeps nothing from an attempt that "
                            + "returns a failure. If it must be stored, return ServiceTaskResult.Success with the action "
                            + "the failure leads to."
                    );
                }
            }
        }
    }

    /// <summary>The writes a step would save: those moved to the mutator, and those v9 refuses until they are moved.</summary>
    private static IEnumerable<StorageClientCall> SavedWrites(MethodRewrite rewrite) =>
        rewrite.MovedWrites.Concat(rewrite.RefusedWrites);

    /// <summary>
    /// P-UNSEEN: Storage clients the transition's code gets from a service provider, and code more calls deep than
    /// the call graph follows.
    /// </summary>
    public static IEnumerable<PortReport> Unseen(
        WindowReach reach,
        IReadOnlyDictionary<IMethodSymbol, List<ReachedMethod>> reached,
        IReadOnlyList<CallSite> tooDeep
    )
    {
        var seen = new HashSet<(string, int)>();
        foreach (var (method, ways) in reached)
        {
            if (reach.Body(method) is not { } body)
            {
                continue;
            }

            foreach (var invocation in body.Operation.DescendantsAndSelf().OfType<IInvocationOperation>())
            {
                if (
                    invocation.TargetMethod.Name is "GetService" or "GetRequiredService"
                    && invocation.TargetMethod.TypeArguments is [var requested]
                    && StorageClientCall.ClientTypeOf(requested) is not null
                    && seen.Add((body.File.RelativePath, invocation.Syntax.SpanStart))
                )
                {
                    yield return PortReport.Located(
                        body.File,
                        invocation.Syntax,
                        UpgradeMessageStatus.Warning,
                        $"{requested.Name} is reachable from {ways[0].Entry.Name} through a service provider but was not "
                            + "followed (a service locator). If it runs during the transition it fails in v9; use the mutator there."
                    );
                }
            }
        }

        foreach (var call in tooDeep)
        {
            if (reach.Body(call.Callee) is not { } body || !reach.StorageCalls(call.Callee).Any())
            {
                continue;
            }

            var entry = reached.TryGetValue(call.Caller, out var ways) ? ways[0].Entry.Name : "the process hook";
            foreach (var storage in reach.StorageCalls(call.Callee))
            {
                if (seen.Add((body.File.RelativePath, storage.Syntax.SpanStart)))
                {
                    yield return PortReport.Located(
                        body.File,
                        storage.Syntax,
                        UpgradeMessageStatus.Warning,
                        $"{storage.DisplayName} is reachable from {entry} through {call.Caller.ContainingType.Name}.{call.Caller.Name} "
                            + $"but was not followed (more than {WindowReach.MaxDepth} calls deep). If it runs during the "
                            + "transition it fails in v9; use the mutator there."
                    );
                }
            }
        }
    }

    /// <summary>
    /// P-PKG: service-owner package code the transition's code calls, once per package, version and member; known
    /// members say what to change, unknown ones that take a Storage client are a warning; package hook types the app
    /// registers; and app types built on a package validator that writes before the claim.
    /// </summary>
    public static IEnumerable<PortReport> Packages(
        WindowReach reach,
        IReadOnlyDictionary<IMethodSymbol, List<ReachedMethod>> reached,
        ProcessHookPortContext context
    )
    {
        var reported = new HashSet<string>(StringComparer.Ordinal);
        foreach (var (method, ways) in reached)
        {
            // A DataCreation without an auto-created data type runs only outside the transition.
            if (!ways.Any(static way => way.Entry.InCallback) || reach.Body(method) is not { } body)
            {
                continue;
            }

            foreach (var operation in body.Operation.DescendantsAndSelf())
            {
                var target = operation switch
                {
                    IInvocationOperation invocation => invocation.TargetMethod,
                    IObjectCreationOperation creation => creation.Constructor,
                    _ => null,
                };
                if (target is null || !IsPackage(target.ContainingAssembly))
                {
                    continue;
                }

                var hook = ways[0].Entry.Name;
                var location =
                    $"{PortReport.DisplayPath(body.File.RelativePath)}:{body.File.GetLine(operation.Syntax)}";
                if (KnownPackageMembers.Find(target) is { } known)
                {
                    var key = $"{known.Package}|{known.Type}|{known.Member}";
                    if (reported.Add(key))
                    {
                        yield return PortReport.Anchored(
                            body.File,
                            operation.Syntax,
                            known.Writes ? UpgradeMessageStatus.Todo : UpgradeMessageStatus.Warning,
                            KnownText(context, known, target, hook, location)
                        );
                    }

                    continue;
                }

                if (
                    UnknownClientUser(target) is { } client
                    && reported.Add(
                        $"{target.ContainingAssembly.Name}|{KnownPackageMember.FullName(target.ContainingType)}"
                    )
                )
                {
                    yield return PortReport.Anchored(
                        body.File,
                        operation.Syntax,
                        UpgradeMessageStatus.Warning,
                        $"{context.AppId} calls {context.PackageName(target.ContainingAssembly.Name)} "
                            + $"{target.ContainingType.Name}.{target.Name} from {hook} ({location}). It takes {client} in its "
                            + "constructor or as a parameter; check that it does not write to Storage during the transition."
                    );
                }
            }
        }
    }

    private static string KnownText(
        ProcessHookPortContext context,
        KnownPackageMember known,
        IMethodSymbol target,
        string hook,
        string location
    )
    {
        var head =
            $"{context.AppId} calls {context.PackageName(known.Package)} {target.ContainingType.Name}.{(target.MethodKind == MethodKind.Constructor ? "ctor" : target.Name)} from {hook} ({location}).";
        if (!known.Writes)
        {
            return $"{head} It {known.Does}, which works while the process is transitioning but bypasses the step's version checks. The package owner can {known.Change}.";
        }

        return $"{head} It {known.Does}, which v9 refuses while the process is transitioning. The package owner must "
            + $"{known.Change}. Until then {known.Workaround ?? "this hook fails in v9"}.";
    }

    private static readonly HashSet<string> _v8Hooks =
    [
        "Altinn.App.Core.Features.IProcessTaskStart",
        "Altinn.App.Core.Features.IProcessTaskEnd",
        "Altinn.App.Core.Features.IProcessTaskAbandon",
        "Altinn.App.Core.Features.IProcessEnd",
        "Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.IServiceTask",
    ];

    /// <summary>
    /// P-PKG for package types the app cannot change: hook classes a package registers itself through an
    /// <c>IServiceCollection</c> extension the app calls, and the app's classes built on a known package base class.
    /// </summary>
    public static IEnumerable<PortReport> PackageTypes(
        IReadOnlyList<ScannedCSharpFile> files,
        ProcessHookPortContext context
    )
    {
        var reported = new HashSet<string>(StringComparer.Ordinal);
        foreach (var file in files)
        {
            if (file.SemanticModel is not { } model)
            {
                continue;
            }

            foreach (var node in file.Root.DescendantNodes())
            {
                if (
                    node is InvocationExpressionSyntax invocation
                    && model.GetSymbolInfo(invocation).Symbol is IMethodSymbol { IsExtensionMethod: true } extension
                    && (extension.ReducedFrom ?? extension)
                        is { Parameters: [{ Type.Name: "IServiceCollection" }, ..] } registering
                    && IsPackage(registering.ContainingAssembly)
                )
                {
                    foreach (var type in HookTypes(registering.ContainingAssembly.GlobalNamespace))
                    {
                        if (!reported.Add($"{type.ContainingAssembly.Name}|{type.Name}"))
                        {
                            continue;
                        }

                        var known = KnownPackageMembers.FindType(type);
                        var package = known?.Package ?? type.ContainingAssembly.Name;
                        var hook = type
                            .AllInterfaces.First(contract =>
                                _v8Hooks.Contains(contract.OriginalDefinition.ToDisplayString())
                            )
                            .Name;
                        yield return PortReport.Located(
                            file,
                            invocation,
                            UpgradeMessageStatus.Todo,
                            $"{context.AppId}: {context.PackageName(package)} registers {type.Name} through "
                                + $"{registering.Name}, and {type.Name} implements {hook}, which v9 removed or moved"
                                + (known is null ? "" : $"; it {known.Does}")
                                + $". The app needs a v9 version of the package{(known is null ? "" : $": its owner must {known.Change}")}."
                                + AtProcessEnd(known, context)
                        );
                    }
                }

                if (
                    node is BaseListSyntax { Parent: TypeDeclarationSyntax declaration }
                    && model.GetDeclaredSymbol(declaration) is { } appType
                    && !reported.Contains($"base|{appType.Name}")
                )
                {
                    for (var current = appType.BaseType; current is not null; current = current.BaseType)
                    {
                        if (
                            KnownPackageMembers.FindType(current) is { } known
                            && !current.AllInterfaces.Any(static contract =>
                                _validators.Contains(contract.OriginalDefinition.ToDisplayString())
                            )
                            && reported.Add($"base|{appType.Name}")
                        )
                        {
                            yield return PortReport.Located(
                                file,
                                declaration,
                                UpgradeMessageStatus.Todo,
                                $"{appType.Name} derives from {context.PackageName(known.Package)} {current.Name}, "
                                    + $"which {known.Does}, and v9 refuses that while the process is transitioning. The "
                                    + $"package owner must {known.Change}; until then this class fails in v9."
                                    + AtProcessEnd(known, context)
                            );
                            break;
                        }
                    }
                }
            }
        }
    }

    /// <summary>The types in a package that implement a v8 hook or service task.</summary>
    private static IEnumerable<INamedTypeSymbol> HookTypes(INamespaceSymbol ns)
    {
        foreach (var type in ns.GetTypeMembers())
        {
            if (
                !type.IsAbstract
                && type.AllInterfaces.Any(static contract =>
                    _v8Hooks.Contains(contract.OriginalDefinition.ToDisplayString())
                    && CSharpSemanticQueries.IsAltinnAppSymbol(contract)
                )
            )
            {
                yield return type;
            }
        }

        foreach (var child in ns.GetNamespaceMembers())
        {
            foreach (var type in HookTypes(child))
            {
                yield return type;
            }
        }
    }

    /// <summary>What the v9 version of a known package must do differently at process end, after a space.</summary>
    private static string AtProcessEnd(KnownPackageMember? known, ProcessHookPortContext context) =>
        known?.AtProcessEnd is { } write && TaskBinding.PackageRefusal(context, write) is { } refusal
            ? $" {refusal}"
            : "";

    /// <summary>
    /// The registrations of package classes that implement a v8 hook, which the port leaves as they are.
    /// </summary>
    public static IEnumerable<PortReport> PackageHookTypes(
        IReadOnlyList<HookRegistration> registrations,
        ISet<ITypeSymbol> ported,
        ProcessHookPortContext context
    )
    {
        foreach (var registration in registrations)
        {
            if (
                registration.Implementation is not { } type
                || ported.Contains(type)
                || !IsPackage(type.ContainingAssembly)
            )
            {
                continue;
            }

            var known = KnownPackageMembers.FindType(type);
            var package = known?.Package ?? type.ContainingAssembly.Name;
            yield return PortReport.Located(
                registration.File,
                registration.Invocation,
                UpgradeMessageStatus.Todo,
                $"{context.PackageName(package)} implements {registration.Family.V8InterfaceName} "
                    + $"in {type.Name}, which the app registers here; v9 removed that interface, so the app needs a v9 "
                    + "version of the package. The registration was left unchanged."
                    + AtProcessEnd(known, context)
            );
        }
    }

    /// <summary>
    /// P-PRECLAIM: Storage writes reached from validators and exclusive gateways, which v9 runs in process/next before
    /// it claims the instance; data values only bypass the step's checks.
    /// </summary>
    public static IEnumerable<PortReport> PreClaim(
        IReadOnlyList<ScannedCSharpFile> files,
        WindowReach reach,
        ProcessHookPortContext context
    )
    {
        foreach (var (type, validator, file, declaration) in Validators(files))
        {
            if (PackageBase(type) is { } packageBase)
            {
                yield return PortReport.Located(
                    file,
                    declaration,
                    UpgradeMessageStatus.Todo,
                    $"{type.Name} derives from {context.PackageName(packageBase.Known.Package)} "
                        + $"{packageBase.Type.Name}, which {packageBase.Known.Does} while process/next validates ({validator}). In v9 "
                        + "that write changes the instance after process/next read it, so the transition answers 409 "
                        + $"instanceChanged every time. The package owner must {packageBase.Known.Change}."
                );
            }
        }

        var seen = new HashSet<(string, int)>();
        foreach (var (validator, entry, file, declaration) in Implementations(files, _validators))
        {
            var pseudo = new WindowEntry(WindowEntryKind.Hook, entry, declaration, file, null, null, false, null);
            foreach (var method in reach.Reach(pseudo, []))
            {
                foreach (var call in reach.StorageCalls(method.Method))
                {
                    if (
                        !IsWrite(call)
                        || reach.Body(method.Method) is not { } body
                        || !seen.Add((body.File.RelativePath, call.Syntax.SpanStart))
                    )
                    {
                        continue;
                    }

                    if (call.Name is "UpdateDataValues" or "UpdateDataValue")
                    {
                        yield return PortReport.Located(
                            body.File,
                            call.Syntax,
                            UpgradeMessageStatus.Warning,
                            $"{call.DisplayName} writes data values while process/next validates ({validator}). This does not "
                                + "stop the transition (data values do not change the instance's version), but it runs on every "
                                + "validation and outside the transition's checks; set them in the task's IOnTaskEndingHandler "
                                + "with dataMutator.SetDataValue."
                        );
                        continue;
                    }

                    yield return PortReport.Located(
                        body.File,
                        call.Syntax,
                        UpgradeMessageStatus.Todo,
                        $"{call.DisplayName} writes to Storage while process/next validates ({validator}). In v9 that write "
                            + "changes the instance after process/next read it, so the transition answers 409 "
                            + $"instanceChanged{(Unconditional(call, method.Method, reach) ? " every time" : "")}. Move it to the "
                            + "task's IOnTaskEndingHandler (through the mutator) or to a data processor."
                    );
                }
            }
        }
    }

    /// <summary>The app's validator types, with the validator method each implements, itself or in a base class.</summary>
    private static IEnumerable<(
        INamedTypeSymbol Type,
        string Validator,
        ScannedCSharpFile File,
        TypeDeclarationSyntax Declaration
    )> Validators(IReadOnlyList<ScannedCSharpFile> files)
    {
        var seen = new HashSet<INamedTypeSymbol>(SymbolEqualityComparer.Default);
        foreach (var file in files)
        {
            if (file.SemanticModel is not { } model)
            {
                continue;
            }

            foreach (var declaration in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
            {
                if (model.GetDeclaredSymbol(declaration) is not { } type || !seen.Add(type))
                {
                    continue;
                }

                var validator = type
                    .AllInterfaces.Where(static contract =>
                        _validators.Contains(contract.OriginalDefinition.ToDisplayString())
                        && CSharpSemanticQueries.IsAltinnAppSymbol(contract)
                    )
                    .SelectMany(static contract =>
                        contract
                            .GetMembers()
                            .OfType<IMethodSymbol>()
                            .Where(static member => member.MethodKind == MethodKind.Ordinary)
                            .Select(member => $"{contract.Name}.{member.Name}")
                    )
                    .FirstOrDefault();
                if (validator is not null)
                {
                    yield return (type, validator, file, declaration);
                }
            }
        }
    }

    /// <summary>A known package base class of the type that writes before the claim.</summary>
    private static (KnownPackageMember Known, INamedTypeSymbol Type)? PackageBase(INamedTypeSymbol type)
    {
        for (var current = type.BaseType; current is not null; current = current.BaseType)
        {
            if (KnownPackageMembers.FindType(current) is { Writes: true } known)
            {
                return (known, current);
            }
        }

        return null;
    }

    /// <summary>Whether nothing in the validator's own method guards the write.</summary>
    private static bool Unconditional(StorageClientCall call, IMethodSymbol method, WindowReach reach) =>
        reach.Body(method) is { Declaration: var declaration }
        && !call
            .Syntax.Ancestors()
            .TakeWhile(ancestor => ancestor != declaration)
            .Any(static ancestor =>
                ancestor
                    is IfStatementSyntax
                        or SwitchStatementSyntax
                        or ConditionalExpressionSyntax
                        or CatchClauseSyntax
            );

    /// <summary>The app's implementations of members of the given Altinn interfaces, named <c>Interface.Member</c>.</summary>
    private static IEnumerable<(
        string Validator,
        IMethodSymbol Method,
        ScannedCSharpFile File,
        MethodDeclarationSyntax Declaration
    )> Implementations(IReadOnlyList<ScannedCSharpFile> files, IReadOnlySet<string> interfaces)
    {
        var filesByTree = files.ToDictionary(static file => file.Root.SyntaxTree, static file => file);
        var seen = new HashSet<ISymbol>(SymbolEqualityComparer.Default);
        foreach (var file in files)
        {
            if (file.SemanticModel is not { } model)
            {
                continue;
            }

            foreach (var declaration in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
            {
                if (model.GetDeclaredSymbol(declaration) is not { } type)
                {
                    continue;
                }

                foreach (
                    var contract in type.AllInterfaces.Where(contract =>
                        interfaces.Contains(contract.OriginalDefinition.ToDisplayString())
                        && CSharpSemanticQueries.IsAltinnAppSymbol(contract)
                    )
                )
                {
                    foreach (var member in contract.GetMembers().OfType<IMethodSymbol>())
                    {
                        if (
                            type.FindImplementationForInterfaceMember(member) is IMethodSymbol implementation
                            && !CSharpSemanticQueries.IsAltinnAppSymbol(implementation)
                            && seen.Add(implementation.OriginalDefinition)
                            && SyntaxEditing.Locate(implementation.OriginalDefinition, filesByTree)
                                is var (methodFile, method)
                        )
                        {
                            yield return (
                                $"{contract.Name}.{member.Name}",
                                implementation.OriginalDefinition,
                                methodFile,
                                method
                            );
                        }
                    }
                }
            }
        }
    }

    private static readonly HashSet<string> _pdfServices = ["Altinn.App.Core.Internal.Pdf.IPdfService"];

    private static readonly HashSet<string> _eFormidling =
    [
        "Altinn.App.Core.EFormidling.Interface.IEFormidlingMetadata",
        "Altinn.App.Core.EFormidling.Interface.IEFormidlingReceivers",
    ];

    /// <summary>
    /// Code v9 runs in the transition that the port does not move: an app's replacement of <c>IPdfService</c>, whose
    /// <c>GenerateAndStorePdf</c> v9 removed (C-XPDF), and eFormidling metadata and receivers, which a later step gives
    /// an accessor; the Storage calls they reach are reported, those the port rewrites elsewhere excepted.
    /// </summary>
    public static IEnumerable<PortReport> NotMoved(
        IReadOnlyList<ScannedCSharpFile> files,
        WindowReach reach,
        IReadOnlySet<IMethodSymbol> rewritten
    )
    {
        var seen = new HashSet<(string, int)>();
        foreach (var (name, method, file, declaration) in Implementations(files, _pdfServices))
        {
            if (!name.EndsWith(".GenerateAndStorePdf", StringComparison.Ordinal))
            {
                continue;
            }

            var hook = $"{method.ContainingType.Name}.GenerateAndStorePdf";
            yield return PortReport.Located(
                file,
                declaration,
                UpgradeMessageStatus.Todo,
                $"{hook} replaces the PDF step with IPdfService.GenerateAndStorePdf, which v9 removed. Generate the PDF "
                    + "with a PDF service task in process.bpmn, or call IPdfService.GeneratePdf and add the bytes with "
                    + "dataMutator.AddBinaryDataElement; use those bytes instead of reading the PDF back."
            );
            foreach (var (call, body) in Calls(reach, (method, file, declaration), rewritten))
            {
                if (seen.Add((body.File.RelativePath, call.Syntax.SpanStart)))
                {
                    yield return PortReport.Located(
                        body.File,
                        call.Syntax,
                        UpgradeMessageStatus.Todo,
                        $"{call.DisplayName} runs in {hook}, which v9 does not call (see {PortReport.DisplayPath(file.RelativePath)}:{file.GetLine(declaration)})."
                    );
                }
            }
        }

        foreach (var (name, method, file, declaration) in Implementations(files, _eFormidling))
        {
            var hook = $"{method.ContainingType.Name}.{method.Name}";
            foreach (var (call, body) in Calls(reach, (method, file, declaration), rewritten))
            {
                if (!seen.Add((body.File.RelativePath, call.Syntax.SpanStart)))
                {
                    continue;
                }

                yield return IsWrite(call)
                    ? PortReport.Located(
                        body.File,
                        call.Syntax,
                        UpgradeMessageStatus.Todo,
                        $"{call.DisplayName} still writes to Storage directly in {hook}, which v9 refuses while the "
                            + $"process is transitioning: {name} runs inside it, and only reads are expected there."
                    )
                    : PortReport.Located(
                        body.File,
                        call.Syntax,
                        UpgradeMessageStatus.Warning,
                        $"{call.DisplayName} reads Storage directly in {hook}; read through dataAccessor instead."
                    );
            }
        }
    }

    /// <summary>The Storage calls <paramref name="method"/> reaches in methods the port does not rewrite.</summary>
    private static IEnumerable<(StorageClientCall Call, MemberBody Body)> Calls(
        WindowReach reach,
        (IMethodSymbol Method, ScannedCSharpFile File, MethodDeclarationSyntax Declaration) implementation,
        IReadOnlySet<IMethodSymbol> rewritten
    )
    {
        var entry = new WindowEntry(
            WindowEntryKind.Hook,
            implementation.Method,
            implementation.Declaration,
            implementation.File,
            null,
            null,
            true,
            null
        );
        foreach (var reached in reach.Reach(entry, []))
        {
            if (rewritten.Contains(reached.Method) || reach.Body(reached.Method) is not { } body)
            {
                continue;
            }

            foreach (var call in reach.StorageCalls(reached.Method))
            {
                yield return (call, body);
            }
        }
    }

    private static string? UnknownClientUser(IMethodSymbol target)
    {
        var parameters = target.Parameters.Concat(
            target.ContainingType.InstanceConstructors.SelectMany(static constructor => constructor.Parameters)
        );
        return parameters
            .Select(static parameter =>
                StorageClientCall.ClientTypeOf(parameter.Type) is { } client
                    ? StorageClientCall.ClientName(client)
                    : null
            )
            .FirstOrDefault(static name => name is not null);
    }

    /// <summary>A service owner's package: a referenced assembly that is neither Altinn's app libraries nor Microsoft's.</summary>
    public static bool IsPackage(IAssemblySymbol? assembly) =>
        assembly is { Name: var name }
        && assembly is not ISourceAssemblySymbol
        && !name.StartsWith("Altinn.App.", StringComparison.Ordinal)
        && !name.StartsWith("Altinn.Platform.", StringComparison.Ordinal)
        && !name.StartsWith("System", StringComparison.Ordinal)
        && !name.StartsWith("Microsoft", StringComparison.Ordinal)
        && name is not ("mscorlib" or "netstandard" or "Newtonsoft.Json");
}
