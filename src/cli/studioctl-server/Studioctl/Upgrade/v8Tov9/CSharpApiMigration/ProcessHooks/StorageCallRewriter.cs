using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// The call rules: each Storage client call in a method the process transition runs becomes
/// the instance data mutator's member that does what v8 did, when the call is for the transition's instance and its
/// result is used in a way the rule handles; otherwise a read stays as it is, which works while the process is
/// transitioning, and a write gets a to-do at its line.
/// </summary>
internal sealed class StorageCallRewriter(
    CurrentInstanceFlow flow,
    DerivedFields fields,
    IReadOnlyList<FormAdd> formAdds,
    WindowReach reach,
    TaskBinding binding
)
{
    private const string DataElementIdentifier = "Altinn.App.Core.Models.DataElementIdentifier";
    private const string MemoryStream = "System.IO.MemoryStream";
    private const string DataElementType = "Altinn.Platform.Storage.Interface.Models.DataElement";

    private static readonly HashSet<string> _formWrites = ["UpdateData", "UpdateFormData"];

    private static readonly HashSet<string> _elementWrites =
    [
        "UpdateData",
        "UpdateFormData",
        "Update",
        "UpdateBinaryData",
        "DeleteData",
        "DeleteBinaryData",
    ];

    private static readonly HashSet<string> _adds = ["InsertBinaryData", "InsertFormData", "GenerateAndStorePdf"];

    private static readonly string[] _metadataLists = ["Tags", "Metadata", "UserDefinedMetadata", "Refs"];

    /// <summary>Plans the rewrite of every Storage call in <paramref name="rewrite"/>'s method.</summary>
    public void Plan(MethodRewrite rewrite, IReadOnlyList<StorageClientCall> calls)
    {
        var targets = calls.ToDictionary(static call => call, flow.Target);
        var refused = Refused(rewrite, calls, targets);
        var kept = calls.Where(call => refused.Keys.Any(write => StaysWith(rewrite, call, write, calls))).ToHashSet();
        // A write with another token stays, so it cannot be the write back of a live read; nor can a refused one.
        var writes = calls
            .Where(call =>
                call.Client == StorageClient.Data
                && _formWrites.Contains(call.Name)
                && targets[call].Kind == TargetKind.Current
                && HasAcceptedAuthentication(call)
                && !refused.ContainsKey(call)
            )
            .ToList();
        var removed = new HashSet<StorageClientCall>();
        var decisions = new Dictionary<StorageClientCall, ReadDecision>();
        foreach (
            var call in calls.Where(static call => call.Client == StorageClient.Data && call.Name == "GetFormData")
        )
        {
            if (targets[call].Kind == TargetKind.Current && AddedElement(rewrite, call) is null)
            {
                decisions[call] = ReadSemantics.Decide(call, writes, SameElement);
            }
        }

        // A value read of the element that a live read changes elsewhere in the method would share the changed object.
        foreach (var (read, decision) in decisions.ToList())
        {
            if (
                decision is { Live: true, WriteBack: null }
                && decisions.Any(other =>
                    other.Key != read && other.Value.WriteBack is not null && SameElement(read, other.Key)
                )
            )
            {
                decisions[read] = ReadDecision.Copy;
            }
        }

        // C-WB2: a read whose bytes only rename the element goes with the rename.
        foreach (
            var call in calls.Where(call =>
                call.Name == "UpdateBinaryData"
                && targets[call].Kind == TargetKind.Current
                && !refused.ContainsKey(call)
            )
        )
        {
            if (call.Written("stream") is { } stream && OwnBytes(call, calls, stream) is { Carriers.Count: > 0 } own)
            {
                removed.UnionWith(calls.Where(read => read.Syntax == own.BytesRead.Syntax));
            }
        }

        foreach (var call in calls)
        {
            if (removed.Contains(call) || kept.Contains(call))
            {
                continue;
            }

            if (refused.TryGetValue(call, out var refusal))
            {
                List<string> lines =
                [
                    .. kept.Where(other => StaysWith(rewrite, other, call, calls))
                        .Select(other => rewrite.File.GetLine(other.Syntax))
                        .Order()
                        .Select(static line => line.ToString(System.Globalization.CultureInfo.InvariantCulture)),
                ];
                rewrite.Todo(call.Syntax, refusal + KeptCalls(call, lines));
                rewrite.RefusedWrites.Add(call);
                continue;
            }

            var target = targets[call];
            // A call that ends unported leaves no edit, and so no use of the mutator.
            var usedMutator = rewrite.UsesMutator;
            var edits = rewrite.Edits.Count;
            switch (call.Client)
            {
                case StorageClient.Data:
                    DataClient(rewrite, call, target, decisions, removed, calls);
                    break;
                case StorageClient.Instance:
                    InstanceClient(rewrite, call, target, calls);
                    break;
                case StorageClient.DataService:
                    DataService(rewrite, call, target);
                    break;
                case StorageClient.Pdf when call.Name == "GenerateAndStorePdf":
                    rewrite.Todo(
                        call.Syntax,
                        "IPdfService.GenerateAndStorePdf is removed in v9. Generate the PDF with a PDF service task in "
                            + "process.bpmn, or call IPdfService.GeneratePdf and add the bytes with "
                            + "dataMutator.AddBinaryDataElement; use those bytes instead of reading the PDF back."
                    );
                    break;
            }

            if (rewrite.Edits.Count == edits)
            {
                rewrite.UsesMutator = usedMutator;
            }
        }
    }

    /// <summary>
    /// What the to-do of a refused write says about the client calls left with it, after a space: the lock, unlock and
    /// no-op <c>Update</c> calls on its element, or the calls on the element a refused add creates.
    /// </summary>
    private static string KeptCalls(StorageClientCall write, IReadOnlyList<string> lines)
    {
        if (lines.Count == 0)
        {
            return "";
        }

        var at = lines.Count == 1 ? $"line {lines[0]}" : $"lines {TaskBinding.And(lines)}";
        if (_adds.Contains(write.Name))
        {
            return lines.Count == 1
                ? $" It was left as it is, and so was the client call on the element it adds at {at}, which goes with it."
                : $" It was left as it is, and so were the client calls on the element it adds at {at}, which go with it.";
        }

        return lines.Count == 1
            ? $" It was left as it is, and so was the other client call on its element at {at}. Remove it with the "
                + "write: each fix above makes it unnecessary."
            : $" It was left as it is, and so were the other client calls on its element at {at}. Remove them with the "
                + "write: each fix above makes them unnecessary.";
    }

    /// <summary>
    /// Whether <paramref name="call"/> stays as it is with the refused <paramref name="write"/>: a lock, unlock or no-op
    /// <c>Update</c> of its element, which only the write needs, or any call on the element a refused add creates,
    /// which the mutator never sees.
    /// </summary>
    private bool StaysWith(
        MethodRewrite rewrite,
        StorageClientCall call,
        StorageClientCall write,
        IReadOnlyList<StorageClientCall> calls
    ) =>
        (call.Name is "LockDataElement" or "UnlockDataElement" || IsNoOpUpdate(rewrite, call))
            && SameElement(call, write)
        || AddOf(call, calls) == write;

    /// <summary>
    /// The data element writes v9 would refuse wherever the method runs them, because their data type is bound to
    /// other tasks, with the to-do each gets instead of a rewrite; a write whose task the code does not tell is
    /// rewritten, and so is one whose data type it does not tell, unless the method unlocks its element.
    /// </summary>
    private Dictionary<StorageClientCall, string> Refused(
        MethodRewrite rewrite,
        IReadOnlyList<StorageClientCall> calls,
        IReadOnlyDictionary<StorageClientCall, CallTarget> targets
    )
    {
        var refused = new Dictionary<StorageClientCall, string>();
        foreach (var call in calls)
        {
            if (
                call.Client != StorageClient.Data
                || !_elementWrites.Contains(call.Name) && call.Name is not ("InsertFormData" or "InsertBinaryData")
                || targets[call].Kind != TargetKind.Current
                || !HasAcceptedAuthentication(call)
                || IsNoOpUpdate(rewrite, call)
            )
            {
                continue;
            }

            var kind = call.Name is "DeleteData" or "DeleteBinaryData" ? WriteKind.Delete : WriteKind.Write;
            if (WrittenDataTypes(call) is not { } dataTypes)
            {
                // An element locked here is of a type bound to another task: v9 locks a task's data after its
                // task-end handlers and unlocks it when the task starts again.
                if (calls.Any(other => other.Name == "UnlockDataElement" && SameElement(other, call)))
                {
                    refused[call] = TaskBinding.UnknownTypeRefusal(call.DisplayName, kind);
                }

                continue;
            }

            if (
                binding.At(rewrite, call.Syntax) is { } current
                && binding.Refusal(call.DisplayName, dataTypes, current, kind) is { } refusal
            )
            {
                refused[call] = refusal;
            }
        }

        return refused;
    }

    /// <summary>The add in the method whose element the call's element argument is, held in a local.</summary>
    private static StorageClientCall? AddOf(StorageClientCall call, IReadOnlyList<StorageClientCall> calls) =>
        Element(call) is ILocalReferenceOperation { Local: var local }
            ? calls.FirstOrDefault(add =>
                add.Name is "InsertFormData" or "InsertBinaryData"
                && SymbolEqualityComparer.Default.Equals(add.Use.Target, local)
            )
            : null;

    /// <summary>C-MM2: an <c>Update</c> that sends the element as the client call before it returned it.</summary>
    private bool IsNoOpUpdate(MethodRewrite rewrite, StorageClientCall call) =>
        call is { Client: StorageClient.Data, Name: "Update" }
        && call.Argument("dataElement") is { } element
        && Changes(rewrite, call, Symbol(Unwrapped(element.Value)))
            is { Properties.Count: 0, FromClientCall: true, UnportedReason: null };

    /// <summary>
    /// The data types a write's element can have: an add's data type, the one its element was looked up by
    /// (<c>DataType == "x"</c>), or those whose class is the form's; <c>null</c> when the code does not say.
    /// </summary>
    private IReadOnlyList<string>? WrittenDataTypes(StorageClientCall call)
    {
        if (call.Name is "InsertFormData" or "InsertBinaryData")
        {
            return
                call.Written("dataType", "dataTypeString", "dataTypeId")?.Value.ConstantValue
                    is { HasValue: true, Value: string added }
                ? [added]
                : null;
        }

        if (Element(call) is { } element && LookedUpDataTypes(element) is { } lookedUp)
        {
            return lookedUp;
        }

        var form = call.Argument("type")?.Value is ITypeOfOperation typeOf
            ? typeOf.TypeOperand
            : FormType(call.Argument("dataToSerialize"));
        return
            form is not null and not { SpecialType: SpecialType.System_Object }
            && binding.FormDataTypes(form) is { Count: > 0 } forms
            ? forms
            : null;
    }

    private static ITypeSymbol? FormType(IArgumentOperation? data) => data is null ? null : Unwrapped(data.Value).Type;

    /// <summary>
    /// The data types an element was looked up by: <c>d.DataType == x</c> or <c>d.DataType.Equals(x)</c> in the
    /// expression that got it, or in the value of the local it is in when the method assigns that once; x a constant,
    /// or a parameter every caller passes a constant for.
    /// </summary>
    private IReadOnlyList<string>? LookedUpDataTypes(IOperation element)
    {
        element = Unwrapped(element);
        if (element is not ILocalReferenceOperation local)
        {
            return DataTypeComparisons(element);
        }

        return Initializers(Root(element), local.Local) is [var only] ? DataTypeComparisons(only) : null;
    }

    private IReadOnlyList<string>? DataTypeComparisons(IOperation lookup)
    {
        var dataTypes = new List<string>();
        foreach (var operation in lookup.DescendantsAndSelf())
        {
            var (compared, value) = operation switch
            {
                IBinaryOperation { OperatorKind: BinaryOperatorKind.Equals } comparison => (
                    comparison.LeftOperand,
                    comparison.RightOperand
                ),
                IInvocationOperation
                {
                    TargetMethod.Name: "Equals",
                    Instance: { } instance,
                    Arguments: [var argument]
                } => (instance, argument.Value),
                _ => (null, null),
            };
            if (
                compared is null
                || value is null
                || Unwrapped(compared) is not IPropertyReferenceOperation { Property.Name: "DataType" }
            )
            {
                continue;
            }

            if (Constants(value) is not { } constants)
            {
                return null;
            }

            dataTypes.AddRange(constants.Where(constant => !dataTypes.Contains(constant)));
        }

        return dataTypes.Count > 0 ? dataTypes : null;
    }

    /// <summary>The string constant <paramref name="value"/> is, or those every caller passes for the parameter it is.</summary>
    private List<string>? Constants(IOperation value)
    {
        value = Unwrapped(value);
        if (value.ConstantValue is { HasValue: true, Value: string constant })
        {
            return [constant];
        }

        if (
            value is not IParameterReferenceOperation { Parameter.ContainingSymbol: IMethodSymbol method } parameter
            || method.MethodKind == MethodKind.AnonymousFunction
            || reach.CallersOf(method) is not { Count: > 0 } callers
        )
        {
            return null;
        }

        var constants = new List<string>();
        foreach (var site in callers)
        {
            if (
                site.Operation is not IInvocationOperation invocation
                || invocation
                    .Arguments.FirstOrDefault(argument => argument.Parameter?.Ordinal == parameter.Parameter.Ordinal)
                    ?.Value.ConstantValue
                    is not { HasValue: true, Value: string passed }
            )
            {
                return null;
            }

            if (!constants.Contains(passed))
            {
                constants.Add(passed);
            }
        }

        return constants;
    }

    private void DataClient(
        MethodRewrite rewrite,
        StorageClientCall call,
        CallTarget target,
        IReadOnlyDictionary<StorageClientCall, ReadDecision> decisions,
        ISet<StorageClientCall> removed,
        IReadOnlyList<StorageClientCall> calls
    )
    {
        switch (call.Name)
        {
            case "GetFormData":
                if (Read(rewrite, call, target))
                {
                    FormRead(rewrite, call, decisions.GetValueOrDefault(call) ?? ReadDecision.Copy, removed);
                }

                return;
            case "GetBinaryData" or "GetBinaryDataStream" or "GetDataBytes":
                if (Read(rewrite, call, target))
                {
                    BinaryRead(rewrite, call);
                }

                return;
            case "GetBinaryDataList":
                if (Read(rewrite, call, target))
                {
                    rewrite.Todo(
                        call.Syntax,
                        $"{call.DisplayName} has no mutator member; build the list from {rewrite.Mutator}.Instance.Data."
                    );
                }

                return;
        }

        var member = call.Name switch
        {
            "InsertFormData" => "AddFormDataElement",
            "InsertBinaryData" => "AddBinaryDataElement",
            "UpdateData" or "UpdateFormData" => "ReplaceFormData",
            "UpdateBinaryData" => "UpdateBinaryDataElement",
            "DeleteData" or "DeleteBinaryData" => "RemoveDataElement",
            "Update" => "UpdateDataElementMetadata",
            _ => null,
        };
        if (call.Name is "LockDataElement" or "UnlockDataElement")
        {
            if (Write(rewrite, call, target, "nothing: the process transition writes locked data"))
            {
                Lock(rewrite, call, calls);
            }

            return;
        }

        if (member is null || !Write(rewrite, call, target, $"{rewrite.Mutator}.{member}"))
        {
            return;
        }

        if (call.Invocation.Arguments.Any(static argument => argument.Parameter?.Type.Name == "HttpRequest"))
        {
            Unported(rewrite, call, "a request body has no meaning in a process hook");
            return;
        }

        switch (call.Name)
        {
            case "InsertFormData":
                FormAdd(rewrite, call);
                break;
            case "InsertBinaryData":
                BinaryAdd(rewrite, call);
                break;
            case "UpdateData" or "UpdateFormData":
                FormWrite(rewrite, call);
                break;
            case "UpdateBinaryData":
                BinaryWrite(rewrite, call, calls);
                break;
            case "DeleteData" or "DeleteBinaryData":
                Delete(rewrite, call);
                break;
            case "Update":
                MetadataWrite(rewrite, call);
                break;
        }
    }

    /// <summary>
    /// A read that the rules may rewrite: one of the current instance with a token the mutator has; another's stays,
    /// and an unknown one, or one with another token, is reported.
    /// </summary>
    private static bool Read(MethodRewrite rewrite, StorageClientCall call, CallTarget target)
    {
        switch (target.Kind)
        {
            case TargetKind.Current:
                return Authenticated(rewrite, call);
            case TargetKind.Unknown:
                rewrite.Warn(
                    call.Syntax,
                    $"{call.DisplayName} reads Storage directly in {rewrite.Entry.Name}; if "
                        + $"{target.Expression?.ToString() ?? "the instance it reads"} is this instance, read through dataMutator."
                );
                return false;
            default:
                return false;
        }
    }

    /// <summary>A write the rules may rewrite: one of the current instance; another's, or an unknown one, is a to-do.</summary>
    private static bool Write(MethodRewrite rewrite, StorageClientCall call, CallTarget target, string mutatorMember)
    {
        switch (target.Kind)
        {
            case TargetKind.Current:
                return Authenticated(rewrite, call);
            case TargetKind.Other:
                rewrite.Todo(
                    call.Syntax,
                    $"{call.DisplayName} writes to another instance ({target.Expression?.ToString() ?? "a new instance"}) "
                        + "from a process hook. The mutator covers only this instance, and the step may run more than "
                        + "once: make the call idempotent or move it out of the transition."
                );
                return false;
            case TargetKind.Unknown when rewrite.Shared is { } shared:
                rewrite.Todo(call.Syntax, SharedHelperText(rewrite, call, shared));
                return false;
            default:
                rewrite.Todo(
                    call.Syntax,
                    $"{call.DisplayName} still writes to Storage directly in {rewrite.Entry.Name}: the upgrade could not "
                        + $"tell which instance {target.Expression?.ToString() ?? "it"} refers to. If it is this instance, "
                        + $"use {mutatorMember}, since v9 refuses direct writes to it while the process is transitioning; "
                        + "if it is another instance, keep the call out of the transition."
                );
                return false;
        }
    }

    /// <summary>H-HELPER for a write in a helper that code outside the transition calls too.</summary>
    public static string SharedHelperText(MethodRewrite rewrite, StorageClientCall call, string shared) =>
        $"{rewrite.Method.ContainingType.Name}.{rewrite.Method.Name} writes to Storage with {call.DisplayName} "
        + $"and {shared}; it was left unchanged. Give the process-hook path its own method that takes "
        + "IInstanceDataMutator.";

    /// <summary>
    /// The call's authentication: none, <c>null</c> or the service owner's, which the engine's save uses anyway in a
    /// callback; any other method is a to-do.
    /// </summary>
    private static bool Authenticated(MethodRewrite rewrite, StorageClientCall call)
    {
        if (
            HasAcceptedAuthentication(call)
            || StorageClientCall.Expression(call.Written("authenticationMethod")) is not { } method
        )
        {
            return true;
        }

        rewrite.Todo(
            call.Syntax,
            $"{call.DisplayName} uses {method} to reach Storage; the engine saves as the app; set "
                + $"{rewrite.Mutator}.OverrideAuthenticationMethod(dataType, …) if this data type needs another token."
        );
        return false;
    }

    private static bool HasAcceptedAuthentication(StorageClientCall call) =>
        StorageClientCall.Expression(call.Written("authenticationMethod")) is not { } method
        || IsServiceOwnerOrNull(method);

    private static bool IsServiceOwnerOrNull(ExpressionSyntax expression) =>
        expression.IsKind(SyntaxKind.NullLiteralExpression) || IsServiceOwner(expression);

    private static bool IsServiceOwner(ExpressionSyntax expression) =>
        expression
            is InvocationExpressionSyntax
            {
                Expression: MemberAccessExpressionSyntax { Name.Identifier.ValueText: "ServiceOwner" },
                ArgumentList.Arguments.Count: 0,
            };

    /// <summary>
    /// In code <c>IInstantiationProcessor.DataCreation</c> runs, which also saves outside the transition with the
    /// caller's token, a call made as the service owner overrides the data type's authentication once, before its first
    /// rewritten call.
    /// </summary>
    private static void OverrideAuthentication(
        MethodRewrite rewrite,
        StorageClientCall call,
        StatementSyntax statement,
        Piece dataType,
        string dataTypeKey
    )
    {
        if (
            !rewrite.InDataCreation
            || StorageClientCall.Expression(call.Written("authenticationMethod")) is not { } method
            || !IsServiceOwner(method)
            || !rewrite.OverriddenDataTypes.Add(dataTypeKey)
        )
        {
            return;
        }

        // Copies: the call they come from is rewritten before the statement is inserted.
        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        rewrite.InsertBefore(
            statement,
            Piece.Statement(
                "$0.OverrideAuthenticationMethod($0.GetDataType($1), $2);",
                mutator,
                dataType.Copy(),
                Piece.Fixed(method)
            )
        );
    }

    /// <param name="removed">Gets the write back that the live read makes unnecessary.</param>
    private void FormRead(
        MethodRewrite rewrite,
        StorageClientCall call,
        ReadDecision decision,
        ISet<StorageClientCall> removed
    )
    {
        if (AddedElement(rewrite, call) is { } added)
        {
            rewrite.Todo(
                call.Syntax,
                $"{call.DisplayName} reads {added.DataType}, which this hook added; the element exists only after the step "
                    + "is saved. Use the object you added."
            );
            return;
        }

        if (ElementId(call) is not { } id)
        {
            UnportedRead(rewrite, call, "the upgrade did not recognize the element it reads");
            return;
        }

        var name = decision.Live ? "GetFormData" : "GetFormDataCopy";
        var generic = call.Method.IsGenericMethod ? $"<{TypeArgument(call)}>" : "";
        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        rewrite.Replace(call.Use.Call, Piece.Expression($"$0.{name}{generic}($1)", mutator, id));
        rewrite.MovedReads.Add(call);
        if (call.Use.Statement is { } statement)
        {
            var key = id.Uses.Count > 0 ? id.Uses[0].ToString() : "";
            OverrideAuthentication(rewrite, call, statement, id, key);
            if (decision.WriteBack is { } writeBack)
            {
                OverrideAuthentication(rewrite, writeBack, statement, id, key);
            }
        }

        if (decision.WriteBack is { } write && write.Use.Statement is { } writeStatement)
        {
            removed.Add(write);
            rewrite.Edits.Remove(writeStatement);
            rewrite.Moved(
                call.Syntax,
                $"{call.DisplayName} now reads the form with {rewrite.Mutator}.GetFormData, and the write back at line "
                    + $"{rewrite.File.GetLine(write.Syntax)} was removed: the transition saves the changed form."
            );
            return;
        }

        rewrite.Moved(
            call.Syntax,
            decision.Live
                ? $"{call.DisplayName} now reads the form with {rewrite.Mutator}.GetFormData."
                : $"{call.DisplayName} now reads a copy of the form with {rewrite.Mutator}.GetFormDataCopy, as v8 read it; "
                    + "changes to the copy are saved only where the code writes it back."
        );
    }

    private static string TypeArgument(StorageClientCall call) =>
        call.Syntax.Expression switch
        {
            MemberAccessExpressionSyntax { Name: GenericNameSyntax generic } => generic
                .TypeArgumentList.Arguments[0]
                .ToString(),
            GenericNameSyntax generic => generic.TypeArgumentList.Arguments[0].ToString(),
            _ => call
                .Invocation.TargetMethod.TypeArguments[0]
                .ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat),
        };

    private void BinaryRead(MethodRewrite rewrite, StorageClientCall call)
    {
        if (AddedElement(rewrite, call) is { } added)
        {
            rewrite.Todo(
                call.Syntax,
                $"{call.DisplayName} reads {added.DataType}, which this hook added; the element exists only after the step "
                    + "is saved. Use the bytes you added."
            );
            return;
        }

        if (ElementId(call) is not { } id || call.Use.Outer is not AwaitExpressionSyntax)
        {
            UnportedRead(rewrite, call, "the upgrade rewrites only awaited reads of an element it recognizes");
            return;
        }

        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        if (call.Use.Statement is { } statement)
        {
            OverrideAuthentication(rewrite, call, statement, id, id.Uses.Count > 0 ? id.Uses[0].ToString() : "");
        }

        var replacement =
            call.Name == "GetDataBytes"
                ? Piece.Expression("(await $0.GetBinaryData($1)).ToArray()", mutator, id)
                : Piece.Expression(
                    "new $2((await $0.GetBinaryData($1)).ToArray())",
                    mutator,
                    id,
                    Piece.Type(MemoryStream)
                );
        rewrite.Replace(call.Use.Outer, replacement);
        rewrite.MovedReads.Add(call);
        rewrite.Moved(call.Syntax, $"{call.DisplayName} now reads the bytes with {rewrite.Mutator}.GetBinaryData.");
    }

    /// <summary>C-WA1: an added form whose object the method creates and does not use after the call.</summary>
    private void FormAdd(MethodRewrite rewrite, StorageClientCall call)
    {
        var model = call.Argument("dataToSerialize");
        var dataType = StorageClientCall.Expression(call.Written("dataType", "dataTypeString", "dataTypeId"));
        if (model is null || dataType is null || StorageClientCall.Expression(model) is not { } modelExpression)
        {
            Unported(rewrite, call, "the upgrade did not recognize its arguments");
            return;
        }

        if (!IsLocalUnusedAfter(model.Value, call))
        {
            rewrite.Todo(
                call.Syntax,
                $"v8 stored {modelExpression} as it was at this call; the mutator saves it as it is when the step ends, "
                    + $"and {modelExpression} changes after this line. Add a copy if later changes must not reach {dataType}."
            );
            return;
        }

        if (
            Added(
                rewrite,
                call,
                dataType,
                (Unwrapped(model.Value) as ILocalReferenceOperation)?.Local,
                $"{call.DisplayName} now adds the form with {rewrite.Mutator}.AddFormDataElement; the transition saves "
                    + $"{modelExpression} as it is when the step ends."
            )
            is not { } added
        )
        {
            return;
        }

        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        added(
            Piece.Expression("$0.AddFormDataElement($1, $2)", mutator, Piece.Of(dataType), Piece.Of(modelExpression))
        );
    }

    /// <summary>C-WA2: an added binary element, with the stream's bytes.</summary>
    private void BinaryAdd(MethodRewrite rewrite, StorageClientCall call)
    {
        var dataType = StorageClientCall.Expression(call.Written("dataType"));
        var contentType = StorageClientCall.Expression(call.Written("contentType"));
        var filename = StorageClientCall.Expression(call.Written("filename"));
        var stream = call.Written("stream");
        if (
            dataType is null
            || contentType is null
            || filename is null
            || stream is null
            || call.Use.Statement is not { } statement
        )
        {
            Unported(rewrite, call, "the upgrade did not recognize its arguments");
            return;
        }

        if (
            Added(
                rewrite,
                call,
                dataType,
                null,
                $"{call.DisplayName} now adds the element with {rewrite.Mutator}.AddBinaryDataElement."
            )
            is not { } added
        )
        {
            return;
        }

        if (Bytes(rewrite, stream, statement) is not { } bytes)
        {
            Unported(rewrite, call, "the method is not async, so the stream cannot be read into bytes there");
            return;
        }

        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        var generated = StorageClientCall.Expression(call.Written("generatedFromTask"));
        var add = generated is null
            ? Piece.Expression(
                "$0.AddBinaryDataElement($1, $2, $3, $4)",
                mutator,
                Piece.Of(dataType),
                Piece.Of(contentType),
                Piece.Of(filename),
                bytes
            )
            : Piece.Expression(
                "$0.AddBinaryDataElement($1, $2, $3, $4, $5)",
                mutator,
                Piece.Of(dataType),
                Piece.Of(contentType),
                Piece.Of(filename),
                bytes,
                Piece.Of(generated)
            );
        OverrideAuthentication(rewrite, call, statement, Piece.Of(dataType), dataType.ToString());
        added(add);
    }

    /// <summary>
    /// How an add is moved, given the mutator call that adds: its result unused, or held in a local used only to add
    /// it to <c>instance.Data</c> (removed), to set its metadata and save it with <c>Update</c> (C-WA3); <c>null</c>
    /// with a to-do when the result is used otherwise, such as its id (C-WA4).
    /// </summary>
    private Action<Piece>? Added(
        MethodRewrite rewrite,
        StorageClientCall call,
        ExpressionSyntax dataType,
        ILocalSymbol? model,
        string message
    )
    {
        var use = call.Use;
        switch (use.Kind)
        {
            case CallUseKind.Statement or CallUseKind.Discard when use.Statement is { } statement:
                return add =>
                {
                    rewrite.ReplaceStatement(statement, Piece.Statement("$0;", add));
                    rewrite.MovedWrites.Add(call);
                    rewrite.Moved(call.Syntax, message);
                };
            case CallUseKind.Declaration
                when use.Target is ILocalSymbol local && use.Statement is LocalDeclarationStatementSyntax declaration:
                if (AddedUses(rewrite, call, local, dataType) is not { } plan)
                {
                    return null;
                }

                return add =>
                {
                    rewrite.Added.Add(new AddedElement(local, call, dataType, model));
                    rewrite.ReplaceStatement(declaration, Piece.Statement($"var {local.Name} = $0;", add));
                    rewrite.MovedWrites.Add(call);
                    rewrite.Moved(call.Syntax, message);
                    plan(rewrite);
                };
            default:
                Unported(rewrite, call, $"it uses the DataElement that {call.Name} returned");
                return null;
        }
    }

    /// <summary>
    /// The plan for the uses of an added element's local, or <c>null</c> (with a to-do) when one is not handled:
    /// <c>instance.Data.Add(r)</c> goes, property sets go into one <c>UpdateDataElementMetadata</c> where
    /// <c>Update(instance, r)</c> was, a <c>Locked = true</c> goes with a warning.
    /// </summary>
    private Action<MethodRewrite>? AddedUses(
        MethodRewrite rewrite,
        StorageClientCall call,
        ILocalSymbol local,
        ExpressionSyntax dataType
    )
    {
        var body = Root(call.Invocation);
        var references = body.DescendantsAndSelf()
            .OfType<ILocalReferenceOperation>()
            .Where(reference =>
                SymbolEqualityComparer.Default.Equals(reference.Local, local) && !reference.IsDeclaration
            )
            .ToList();
        var sets = new List<(string Property, ExpressionStatementSyntax Statement, IOperation Value)>();
        var dataAdds = new List<ExpressionStatementSyntax>();
        var updates = new List<StorageClientCall>();
        foreach (var reference in references)
        {
            switch (reference.Parent)
            {
                case IPropertyReferenceOperation { Property.Name: "Id" }:
                    rewrite.Todo(
                        call.Syntax,
                        $"uses the id of the {dataType} element added here, at line {rewrite.File.GetLine(reference.Syntax)}; "
                            + "the mutator gets that id from Storage only when the step is saved. Store the reference after "
                            + "the step (for example in the next task's start hook) or keep this code outside the process "
                            + "transition."
                    );
                    return null;
                case IPropertyReferenceOperation
                {
                    Property.Name: "Tags" or "Metadata" or "UserDefinedMetadata" or "Refs" or "Locked",
                    Parent: ISimpleAssignmentOperation { Parent: IExpressionStatementOperation } assignment,
                } property
                    when assignment.Target == property
                        && assignment.Syntax.Parent is ExpressionStatementSyntax setStatement:
                    sets.Add((property.Property.Name, setStatement, assignment.Value));
                    break;
                case IArgumentOperation { Parent: IInvocationOperation invocation } argument
                    when StorageClientCall.From(invocation) is { Name: "Update" } update
                        && update.Argument("dataElement") == argument:
                    updates.Add(update);
                    break;
                case IArgumentOperation { Parent: IInvocationOperation invocation } argument
                    when StorageClientCall.From(invocation) is { Name: "UpdateFormData" } write
                        && write.Argument("dataElement") == argument:
                    // C-WF3 decides about the write of the added form.
                    break;
                case IArgumentOperation
                {
                    Parent: IInvocationOperation
                    {
                        TargetMethod.Name: "Add",
                        Instance: IPropertyReferenceOperation { Property.Name: "Data" } data
                    } invocation
                }
                    when flow.Evaluate(data.Instance) is { IsCurrent: true, Part: InstancePart.Instance }
                        && invocation.Syntax.Parent is ExpressionStatementSyntax addStatement:
                    dataAdds.Add(addStatement);
                    break;
                default:
                    Unported(rewrite, call, $"it uses the DataElement that {call.Name} returned");
                    return null;
            }
        }

        if (sets.Count > 0 && updates.Count != 1 || updates.Count > 1)
        {
            Unported(
                rewrite,
                call,
                $"it changes the DataElement that {call.Name} returned without one Update to save it"
            );
            return null;
        }

        return target =>
        {
            foreach (var statement in dataAdds)
            {
                target.Edits.Remove(statement);
            }

            foreach (var (property, statement, _) in sets)
            {
                target.Edits.Remove(statement);
                if (property == "Locked")
                {
                    target.Moved(
                        statement,
                        $"dropped Locked = true on the new {dataType} element: v9 locks a task's data when the task "
                            + "ends, and data element locks are being removed."
                    );
                }
            }

            if (updates is not [var update] || update.Use.Statement is not { } updateStatement)
            {
                return;
            }

            var properties = sets.Where(static set => set.Property != "Locked").ToList();
            if (properties.Count == 0)
            {
                target.Edits.Remove(updateStatement);
                return;
            }

            var mutator = Piece.Fixed(target.MutatorExpression());
            var assignments = properties
                .Select(set => Piece.Expression($"{set.Property} = $0", Piece.Of(set.Value.Syntax)))
                .ToList();
            var (initializer, holes) = Piece.Joined(assignments, ", ", 1);
            target.ReplaceStatement(
                updateStatement,
                Piece.Statement(
                    $"$0.UpdateDataElementMetadata({local.Name}.DataElementIdentifier, new() {{ {initializer} }});",
                    [mutator, .. holes]
                )
            );
            target.Moved(
                update.Syntax,
                $"IDataClient.Update now sets the new element's metadata with {target.Mutator}.UpdateDataElementMetadata."
            );
        };
    }

    /// <summary>C-WF1, with C-WF3 for the form a rewritten add made in the same method.</summary>
    private void FormWrite(MethodRewrite rewrite, StorageClientCall call)
    {
        var model = call.Argument("dataToSerialize");
        if (
            model is null
            || StorageClientCall.Expression(model) is not { } modelExpression
            || ElementId(call) is not { } id
        )
        {
            Unported(rewrite, call, "the upgrade did not recognize its arguments");
            return;
        }

        if (AddedElement(rewrite, call) is { } added)
        {
            if (
                Unwrapped(model.Value) is ILocalReferenceOperation local
                && SymbolEqualityComparer.Default.Equals(local.Local, added.Model)
                && call.Use.Statement is { } addedStatement
                && call.Use.Kind is CallUseKind.Statement or CallUseKind.Discard
            )
            {
                rewrite.Edits.Remove(addedStatement);
                rewrite.Moved(
                    call.Syntax,
                    $"removed {call.DisplayName} of the form added at line {rewrite.File.GetLine(added.Add.Syntax)}: the "
                        + "mutator saves the added object as it is when the step ends."
                );
                return;
            }

            rewrite.Todo(
                call.Syntax,
                $"{call.DisplayName} writes {added.DataType} right after {rewrite.Entry.Name} added it; in v9 an added "
                    + "element is saved as it is at the end of the step, and ReplaceFormData cannot target it. Change the "
                    + "object passed to AddFormDataElement instead."
            );
            return;
        }

        if (EarlierFormAdd(rewrite, call) is { } earlier)
        {
            var others = rewrite
                .Entries.Where(entry => entry != earlier.Entry)
                .Select(static entry => entry.Name)
                .Distinct(StringComparer.Ordinal)
                .ToList();
            var dataType = StorageClientCall.Expression(
                earlier.Add.Written("dataType", "dataTypeString", "dataTypeId")
            );
            rewrite.Todo(
                call.Syntax,
                $"{rewrite.Method.ContainingType.Name}.{rewrite.Method.Name} writes {dataType?.ToString() ?? "a form"} "
                    + $"right after {earlier.Entry.Name} added it"
                    + (others.Count > 0 ? $", and also from {string.Join(", ", others)}" : "")
                    + "; in v9 an added element is saved as it is at the end of the step, and ReplaceFormData cannot "
                    + "target it. Give the add path its own code that changes the object it passes to AddFormDataElement."
            );
            return;
        }

        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        var replace = Piece.Expression("$0.ReplaceFormData($1, $2)", mutator, id, Piece.Of(modelExpression));
        if (!StagedAsync(rewrite, call, replace, id))
        {
            return;
        }

        rewrite.MovedWrites.Add(call);
        rewrite.Moved(
            call.Syntax,
            $"{call.DisplayName} now replaces the form with {rewrite.Mutator}.ReplaceFormData, which saves "
                + $"{modelExpression} as it is here, as v8 did."
        );
    }

    /// <summary>
    /// An async mutator call (<c>ReplaceFormData</c>) in place of a client write that returned the element: awaited
    /// as a statement (waited for in a method that is not async), and the element taken from the mutator where the code
    /// uses what the call returned.
    /// </summary>
    private static bool StagedAsync(MethodRewrite rewrite, StorageClientCall call, Piece staged, Piece id)
    {
        var use = call.Use;
        var statement = use.Statement;
        var awaited = rewrite.IsAsync
            ? Piece.Statement("await $0;", staged)
            : Piece.Statement("$0.GetAwaiter().GetResult();", staged);
        switch (use.Kind)
        {
            case CallUseKind.Statement
            or CallUseKind.Discard when statement is not null && (use.Awaited || rewrite.IsAsync):
            case CallUseKind.Assignment when statement is not null && IsElementArgument(call, use.Target):
                rewrite.ReplaceStatement(statement, awaited);
                OverrideFor(rewrite, call, statement, id);
                return true;
            case CallUseKind.Statement or CallUseKind.Discard when statement is not null:
                // v8 did not wait for the write; the mutator stages it only when it completes, before the step saves.
                rewrite.ReplaceStatement(statement, Piece.Statement("$0.GetAwaiter().GetResult();", staged));
                OverrideFor(rewrite, call, statement, id);
                return true;
            case CallUseKind.Declaration
            or CallUseKind.Assignment when statement is not null && use.Awaited && use.Target is { } target:
                var mutator = Piece.Fixed(rewrite.MutatorExpression());
                var element = Piece.Expression("$0.GetDataElement($1)", mutator, id);
                var assign =
                    use.Kind == CallUseKind.Declaration && statement is LocalDeclarationStatementSyntax declaration
                        ? Piece.Statement($"{declaration.Declaration.Type} {target.Name} = $0;", element)
                        : Piece.Statement(
                            $"{((AssignmentExpressionSyntax)((ExpressionStatementSyntax)statement).Expression).Left} = $0;",
                            element
                        );
                rewrite.ReplaceStatement(statement, awaited, assign);
                OverrideFor(rewrite, call, statement, id);
                return true;
            case CallUseKind.Return
                when statement is ReturnStatementSyntax && !rewrite.IsAsync && ReturnsPlainTask(rewrite):
                rewrite.ReplaceStatement(statement, Piece.Statement("return $0;", staged));
                return true;
            case CallUseKind.Return
                when ArrowBodied(rewrite, call) is not null && !rewrite.IsAsync && ReturnsPlainTask(rewrite):
                rewrite.Replace(use.Outer, staged);
                return true;
            case CallUseKind.Return when ArrowBodied(rewrite, call) is { } arrowMethod && rewrite.IsAsync:
                var returned = ReturnsPlainTask(rewrite)
                    ? (Piece[])[]
                    :
                    [
                        Piece.Statement(
                            "return $0;",
                            Piece.Expression("$0.GetDataElement($1)", Piece.Fixed(rewrite.MutatorExpression()), id)
                        ),
                    ];
                WithBlockBody(rewrite, arrowMethod, [awaited, .. returned]);
                return true;
            default:
                Unported(rewrite, call, $"it uses the DataElement that {call.Name} returned");
                return false;
        }
    }

    private static void OverrideFor(
        MethodRewrite rewrite,
        StorageClientCall call,
        StatementSyntax statement,
        Piece id
    ) =>
        OverrideAuthentication(
            rewrite,
            call,
            statement,
            id,
            string.Join(",", id.Uses.Select(static use => use.ToString()))
        );

    /// <summary>The rewritten method, when the call is its expression body.</summary>
    private static MethodDeclarationSyntax? ArrowBodied(MethodRewrite rewrite, StorageClientCall call) =>
        call.Use.Outer.Parent is ArrowExpressionClauseSyntax { Parent: MethodDeclarationSyntax method }
        && method == rewrite.Body.Declaration
            ? method
            : null;

    /// <summary>The method's expression body as a block of <paramref name="statements"/>.</summary>
    private static void WithBlockBody(
        MethodRewrite rewrite,
        MethodDeclarationSyntax method,
        IReadOnlyList<Piece> statements
    ) =>
        rewrite.Edits.Replace(
            method,
            lookup =>
                SyntaxEditing.WithBlockBody(
                    lookup.Current(method),
                    [.. statements.Select(statement => (StatementSyntax)statement.Build(lookup))],
                    rewrite.LineEnding
                ),
            [.. statements.SelectMany(static statement => statement.Uses)]
        );

    private static bool ReturnsPlainTask(MethodRewrite rewrite) =>
        rewrite.Method.ReturnType.ToDisplayString() == "System.Threading.Tasks.Task";

    private static bool IsElementArgument(StorageClientCall call, ISymbol? target)
    {
        if (target is null)
        {
            return false;
        }

        var element = call.Argument("dataElement")?.Value;
        return element is not null
            && Symbol(Unwrapped(element)) is { } symbol
            && SymbolEqualityComparer.Default.Equals(symbol, target);
    }

    /// <summary>
    /// A staging member (void) in place of a client write: the statement, an assignment of the result to what the
    /// call was given or to the current instance dropped, a declaration of the result taken from the mutator.
    /// </summary>
    private static bool Staged(
        MethodRewrite rewrite,
        StorageClientCall call,
        IReadOnlyList<Piece> statements,
        Piece? result,
        Func<ISymbol?, bool> assignmentDropped
    )
    {
        if (Staging(rewrite, call, result, assignmentDropped) is not { } stage)
        {
            return false;
        }

        stage(statements);
        return true;
    }

    /// <summary>
    /// How <see cref="Staged"/> puts the staging statements in place of the call, decided before they are built;
    /// <c>null</c> with a to-do when the code uses the call's result in a way it does not handle.
    /// </summary>
    private static Action<IReadOnlyList<Piece>>? Staging(
        MethodRewrite rewrite,
        StorageClientCall call,
        Piece? result,
        Func<ISymbol?, bool> assignmentDropped
    )
    {
        var use = call.Use;
        var statement = use.Statement;
        switch (use.Kind)
        {
            case CallUseKind.Statement or CallUseKind.Discard when statement is not null:
                return statements => rewrite.ReplaceStatement(statement, [.. statements]);
            case CallUseKind.Assignment when statement is not null && assignmentDropped(use.Target):
                return statements => rewrite.ReplaceStatement(statement, [.. statements]);
            case CallUseKind.Declaration
                when statement is LocalDeclarationStatementSyntax declaration
                    && result is not null
                    && use.Target is { } local:
                return statements =>
                    rewrite.ReplaceStatement(
                        statement,
                        [.. statements, Piece.Statement($"{declaration.Declaration.Type} {local.Name} = $0;", result)]
                    );
            case CallUseKind.Return when statement is ReturnStatementSyntax && rewrite.IsAsync && result is not null:
                return statements =>
                    rewrite.ReplaceStatement(statement, [.. statements, Piece.Statement("return $0;", result)]);
            case CallUseKind.Return
                when ArrowBodied(rewrite, call) is { } method && (rewrite.IsAsync || ReturnsPlainTask(rewrite)):
                Piece[] tail = [];
                if (!rewrite.IsAsync)
                {
                    tail = [Piece.Statement("return $0.CompletedTask;", Piece.Type("System.Threading.Tasks.Task"))];
                }
                else if (result is not null && !ReturnsPlainTask(rewrite))
                {
                    tail = [Piece.Statement("return $0;", result)];
                }

                return statements => WithBlockBody(rewrite, method, [.. statements, .. tail]);
            case CallUseKind.Return
                when statement is ReturnStatementSyntax && !rewrite.IsAsync && ReturnsPlainTask(rewrite):
                return statements =>
                    rewrite.ReplaceStatement(
                        statement,
                        [
                            .. statements,
                            Piece.Statement("return $0.CompletedTask;", Piece.Type("System.Threading.Tasks.Task")),
                        ]
                    );
            default:
                Unported(rewrite, call, $"it uses what {call.Name} returned");
                return null;
        }
    }

    /// <summary>C-WD: an immediate delete; v8's <c>DeleteBinaryData</c> is <c>DeleteData</c> without a delay.</summary>
    private void Delete(MethodRewrite rewrite, StorageClientCall call)
    {
        if (
            call.Name != "DeleteBinaryData"
            && call.Argument("delay")?.Value.ConstantValue is not { HasValue: true, Value: false }
        )
        {
            Unported(rewrite, call, "it deletes with a delay, which the mutator does not do");
            return;
        }

        if (AddedElement(rewrite, call) is not null || ElementId(call) is not { } id)
        {
            Unported(rewrite, call, "the upgrade did not recognize the element it deletes");
            return;
        }

        var statement = call.Use.Statement;

        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        if (
            !Staged(rewrite, call, [Piece.Statement("$0.RemoveDataElement($1);", mutator, id)], null, static _ => false)
        )
        {
            return;
        }

        rewrite.MovedWrites.Add(call);
        rewrite.Moved(
            call.Syntax,
            $"{call.DisplayName} now removes the element with {rewrite.Mutator}.RemoveDataElement."
        );
        if (statement is not null)
        {
            OverrideFor(rewrite, call, statement, id);
            HandEditsAfterDelete(rewrite, call, statement);
        }
    }

    /// <summary>
    /// C-HAND after a delete: <c>instance.Data.Remove(el)</c> and <c>instance.Data.RemoveAll(…)</c> on the current
    /// instance go, since the mutator's instance is the engine's view; a later read of <c>instance.Data</c> is warned about.
    /// </summary>
    private void HandEditsAfterDelete(MethodRewrite rewrite, StorageClientCall call, StatementSyntax statement)
    {
        var element = Symbol(Element(call));
        var body = Root(call.Invocation);
        var loop = statement.Ancestors().OfType<CommonForEachStatementSyntax>().FirstOrDefault();
        var removed = new HashSet<SyntaxNode>();
        foreach (var invocation in body.DescendantsAndSelf().OfType<IInvocationOperation>())
        {
            if (
                invocation.TargetMethod.Name is not ("Remove" or "RemoveAll")
                || invocation.Instance is not IPropertyReferenceOperation { Property.Name: "Data" } data
                || flow.Evaluate(data.Instance) is not { IsCurrent: true, Part: InstancePart.Instance }
                || invocation.Syntax.Parent is not ExpressionStatementSyntax handEdit
                || handEdit.SpanStart < statement.Span.End
                || handEdit.Parent != statement.Parent
                    && (loop is null || !loop.Span.Contains(handEdit.Span) && handEdit.Parent != loop.Parent)
            )
            {
                continue;
            }

            if (
                invocation.TargetMethod.Name == "Remove"
                && (
                    element is null
                    || Symbol(Unwrapped(invocation.Arguments[0].Value)) is not { } removedElement
                    || !SymbolEqualityComparer.Default.Equals(removedElement, element)
                )
            )
            {
                continue;
            }

            if (removed.Add(handEdit))
            {
                rewrite.Edits.Remove(handEdit);
                rewrite.Moved(
                    handEdit,
                    $"removed {handEdit.ToString().Trim()}: {rewrite.Mutator}.RemoveDataElement removes the element."
                );
            }
        }

        var after = loop?.Span.End ?? statement.Span.End;
        if (
            body.DescendantsAndSelf()
                .OfType<IPropertyReferenceOperation>()
                .Any(reference =>
                    reference.Property.Name == "Data"
                    && reference.Syntax.SpanStart > after
                    && !removed.Any(node => node.Span.Contains(reference.Syntax.Span))
                    && flow.Evaluate(reference.Instance) is { IsCurrent: true, Part: InstancePart.Instance }
                )
        )
        {
            rewrite.Moved(call.Syntax, "the element stays in instance.Data until the step is saved.");
        }
    }

    /// <summary>C-MM1 and C-MM2: <c>Update</c> sets the element's lists that the method changed, or goes when nothing changed.</summary>
    private void MetadataWrite(MethodRewrite rewrite, StorageClientCall call)
    {
        var elementArgument = call.Argument("dataElement");
        if (elementArgument is null || StorageClientCall.Expression(elementArgument) is not { } elementExpression)
        {
            Unported(rewrite, call, "the upgrade did not recognize the element it updates");
            return;
        }

        var statement = call.Use.Statement;

        if (AddedElement(rewrite, call) is not null)
        {
            return;
        }

        var element = Symbol(Unwrapped(elementArgument.Value));
        var changes = Changes(rewrite, call, element);
        if (changes.UnportedReason is { } unported)
        {
            Unported(rewrite, call, unported);
            return;
        }

        if (changes.Properties.Count == 0 && changes.FromClientCall)
        {
            if (Staged(rewrite, call, [], null, target => SymbolEqualityComparer.Default.Equals(target, element)))
            {
                rewrite.Moved(
                    call.Syntax,
                    $"removed {call.DisplayName}: nothing it sends changed since the element was read."
                );
            }

            return;
        }

        foreach (var (property, node) in changes.Dropped)
        {
            if (property == "Locked")
            {
                rewrite.Edits.Remove(node);
                rewrite.Moved(
                    node,
                    "dropped the Locked change: v9 unlocks a task's data when the task starts and locks it after the "
                        + "task-end handlers."
                );
            }
            else
            {
                rewrite.Moved(
                    node,
                    $"the {property} change is not saved: v8's PUT ignored it, and so does the mutator."
                );
            }
        }

        var properties =
            changes.Properties.Count > 0 ? changes.Properties : ["Tags", "Metadata", "UserDefinedMetadata", "Refs"];
        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        var assignments = properties
            .Select(property => Piece.Expression($"{property} = $0.{property}", Piece.Of(elementExpression)))
            .ToList();
        var (initializer, holes) = Piece.Joined(assignments, ", ", 2);
        var update = Piece.Statement(
            $"$0.UpdateDataElementMetadata($1, new() {{ {initializer} }});",
            [mutator, Piece.Of(elementExpression), .. holes]
        );
        if (!Staged(rewrite, call, [update], null, target => SymbolEqualityComparer.Default.Equals(target, element)))
        {
            return;
        }

        if (statement is not null)
        {
            OverrideFor(rewrite, call, statement, Piece.Of(elementExpression));
        }

        rewrite.MovedWrites.Add(call);
        rewrite.Moved(
            call.Syntax,
            $"{call.DisplayName} now sets {string.Join(", ", properties)} with {rewrite.Mutator}.UpdateDataElementMetadata."
        );
    }

    private sealed record ElementChanges(
        IReadOnlyList<string> Properties,
        IReadOnlyList<(string Property, StatementSyntax Node)> Dropped,
        bool FromClientCall,
        string? UnportedReason
    );

    /// <summary>What the code does with an element between getting it and a call that sends it.</summary>
    private sealed class ElementUses
    {
        public List<string> Lists { get; } = [];

        public List<(string Property, StatementSyntax Node)> Dropped { get; } = [];

        public string? UnportedReason { get; set; }

        /// <summary>Whether the element itself went somewhere the rewrite does not follow, which can change any list.</summary>
        public bool Escapes { get; set; }
    }

    /// <summary>
    /// The element's lists the code may have changed since it got the element: each list it changes or uses at all,
    /// in the method and, for a parameter, in each caller before its call; all four when the element itself is used
    /// otherwise on the way, such as passed to a method or held in another variable. Whether the element came straight
    /// from a client call.
    /// </summary>
    private ElementChanges Changes(MethodRewrite rewrite, StorageClientCall call, ISymbol? element)
    {
        var body = Root(call.Invocation);
        var (start, fromClientCall) = Obtained(body, element, call.Syntax.SpanStart);
        var uses = new ElementUses();
        if (element is not (ILocalSymbol or IParameterSymbol))
        {
            uses.Escapes = true;
        }
        else
        {
            Uses(body, element, start, call.Syntax.SpanStart, uses, inMethod: true);
            if (element is IParameterSymbol parameter && start == 0)
            {
                CallerUses(rewrite.Method, parameter, uses);
            }
        }

        return new ElementChanges(
            uses.Escapes ? _metadataLists : uses.Lists,
            uses.Dropped,
            fromClientCall,
            uses.UnportedReason
        );
    }

    /// <summary>
    /// Where the method last gives the local or parameter its element before <paramref name="before"/>, and whether
    /// that is a client call's result.
    /// </summary>
    private static (int Start, bool FromClientCall) Obtained(IOperation body, ISymbol? element, int before)
    {
        var start = 0;
        var fromClientCall = false;
        if (element is not (ILocalSymbol or IParameterSymbol))
        {
            return (start, fromClientCall);
        }

        foreach (var write in body.DescendantsAndSelf())
        {
            IOperation? value = write switch
            {
                ISimpleAssignmentOperation assignment
                    when Symbol(assignment.Target) is { } target
                        && SymbolEqualityComparer.Default.Equals(target, element) => assignment.Value,
                IVariableDeclaratorOperation declarator
                    when SymbolEqualityComparer.Default.Equals(declarator.Symbol, element) => declarator
                    .Initializer
                    ?.Value,
                _ => null,
            };
            if (value is not null && write.Syntax.Span.End < before && write.Syntax.SpanStart >= start)
            {
                start = write.Syntax.Span.End;
                fromClientCall =
                    (Unwrapped(value) is IAwaitOperation awaited ? Unwrapped(awaited.Operation) : Unwrapped(value))
                        is IInvocationOperation invocation
                    && StorageClientCall.From(invocation) is not null;
            }
        }

        return (start, fromClientCall);
    }

    /// <summary>The uses of <paramref name="element"/> in <paramref name="body"/> from <paramref name="start"/> up to <paramref name="end"/>.</summary>
    /// <param name="inMethod">Whether the body is the method the call is in, where a dropped change can be removed.</param>
    private static void Uses(IOperation body, ISymbol element, int start, int end, ElementUses uses, bool inMethod)
    {
        foreach (var reference in body.DescendantsAndSelf())
        {
            if (
                reference.Syntax.SpanStart < start
                || reference.Syntax.SpanStart >= end
                || reference is not (ILocalReferenceOperation { IsDeclaration: false } or IParameterReferenceOperation)
                || !SymbolEqualityComparer.Default.Equals(Symbol(reference), element)
            )
            {
                continue;
            }

            Use(reference, uses, inMethod);
        }
    }

    private static void Use(IOperation reference, ElementUses uses, bool inMethod)
    {
        var holder = reference;
        while (holder.Parent is IConversionOperation or IParenthesizedOperation)
        {
            holder = holder.Parent;
        }

        switch (holder.Parent)
        {
            case IPropertyReferenceOperation property when property.Instance == holder:
                var name = property.Property.Name;
                if (_metadataLists.Contains(name))
                {
                    if (!uses.Lists.Contains(name))
                    {
                        uses.Lists.Add(name);
                    }

                    return;
                }

                if (name is "Locked" or "Filename" or "ContentType" && IsChanged(property))
                {
                    if (inMethod && property.Syntax.FirstAncestorOrSelf<StatementSyntax>() is { } node)
                    {
                        uses.Dropped.Add((name, node));
                    }

                    return;
                }

                if (name is "DeleteStatus" or "References" && !IsValueRead(property))
                {
                    uses.UnportedReason = $"it sets {name}, which the mutator cannot set";
                }

                return;
            case IIsPatternOperation:
            case IBinaryOperation { OperatorKind: BinaryOperatorKind.Equals or BinaryOperatorKind.NotEquals }:
            case ISimpleAssignmentOperation assignment when assignment.Target == holder:
                return;
            default:
                uses.Escapes = true;
                return;
        }
    }

    /// <summary>
    /// For an element parameter, what each caller does with the element it passes before the call: a local it got
    /// the element in is followed there; anything else the caller holds the element in escapes.
    /// </summary>
    private void CallerUses(IMethodSymbol method, IParameterSymbol parameter, ElementUses uses)
    {
        var callers = reach.CallersOf(method);
        if (callers.Count == 0)
        {
            uses.Escapes = true;
            return;
        }

        foreach (var site in callers)
        {
            if (
                site.Operation is not IInvocationOperation invocation
                || invocation.Arguments.FirstOrDefault(argument => argument.Parameter?.Ordinal == parameter.Ordinal)
                    is not { } argument
            )
            {
                uses.Escapes = true;
                return;
            }

            switch (Unwrapped(argument.Value))
            {
                case ILocalReferenceOperation local:
                    var body = Root(invocation);
                    var (start, _) = Obtained(body, local.Local, invocation.Syntax.SpanStart);
                    Uses(body, local.Local, start, invocation.Syntax.SpanStart, uses, inMethod: false);
                    break;
                case IInvocationOperation or IPropertyReferenceOperation { Property.IsIndexer: true }:
                    // Looked up in the call itself, so nothing touched it on the way.
                    break;
                default:
                    uses.Escapes = true;
                    return;
            }
        }
    }

    /// <summary>Whether the code assigns the property or changes the collection it holds.</summary>
    private static bool IsChanged(IPropertyReferenceOperation property) =>
        property.Parent switch
        {
            IAssignmentOperation assignment => assignment.Target == property,
            IIncrementOrDecrementOperation => true,
            IInvocationOperation
            {
                TargetMethod.Name: "Add" or "AddRange" or "Clear" or "Remove" or "RemoveAll" or "Insert" or "RemoveAt"
            } invocation => invocation.Instance == property,
            _ => false,
        };

    /// <summary>A read of a value type or string from the element, through members of what it holds.</summary>
    private static bool IsValueRead(IOperation operation)
    {
        var top = operation;
        while (
            top.Parent is IPropertyReferenceOperation { Property.IsIndexer: false } property && property.Instance == top
            || top.Parent is IFieldReferenceOperation field && field.Instance == top
        )
        {
            top = top.Parent;
        }

        if (top.Type is not { } type || !(type.IsValueType || type.SpecialType == SpecialType.System_String))
        {
            return false;
        }

        return top.Parent switch
        {
            IAssignmentOperation assignment => assignment.Target != top,
            IIncrementOrDecrementOperation => false,
            _ => true,
        };
    }

    /// <summary>C-WB1 and C-WB2: new content, or only a new filename when the bytes are the element's own.</summary>
    private void BinaryWrite(MethodRewrite rewrite, StorageClientCall call, IReadOnlyList<StorageClientCall> calls)
    {
        var contentType = StorageClientCall.Expression(call.Written("contentType"));
        var filename = StorageClientCall.Expression(call.Written("filename"));
        var stream = call.Written("stream");
        if (
            contentType is null
            || filename is null
            || stream is null
            || ElementId(call) is not { } id
            || call.Use.Statement is not { } statement
        )
        {
            Unported(rewrite, call, "the upgrade did not recognize its arguments");
            return;
        }

        if (AddedElement(rewrite, call) is not null)
        {
            Unported(rewrite, call, "it writes an element this hook added");
            return;
        }

        if (Staging(rewrite, call, null, static _ => true) is not { } stage)
        {
            return;
        }

        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        var rename = Piece.Statement(
            "$0.UpdateDataElementMetadata($1, new() { Filename = $2 });",
            mutator,
            id,
            Piece.Of(filename)
        );
        if (OwnBytes(call, calls, stream) is { } own)
        {
            stage([rename]);
            foreach (var carrier in own.Carriers)
            {
                rewrite.Edits.Remove(carrier);
            }

            rewrite.MovedWrites.Add(call);
            rewrite.Moved(
                call.Syntax,
                $"{call.DisplayName} only renamed the element, so it now sets the filename with {rewrite.Mutator}.UpdateDataElementMetadata."
            );
            return;
        }

        if (Bytes(rewrite, stream, statement) is not { } bytes)
        {
            Unported(rewrite, call, "the method is not async, so the stream cannot be read into bytes there");
            return;
        }

        var type = Piece.Of(contentType);
        if (contentType.IsKind(SyntaxKind.NullLiteralExpression))
        {
            type = Piece.Expression("$0.GetDataElement($1).ContentType", mutator, id);
        }
        else if (call.Written("contentType")?.Value.Type?.NullableAnnotation == NullableAnnotation.Annotated)
        {
            type = Piece.Expression("$0 ?? $1.GetDataElement($2).ContentType", Piece.Of(contentType), mutator, id);
        }
        var statements = new List<Piece>
        {
            Piece.Statement("$0.UpdateBinaryDataElement($1, $2, $3);", mutator, id, type, bytes),
        };
        if (!filename.IsKind(SyntaxKind.NullLiteralExpression))
        {
            statements.Add(rename);
        }

        stage(statements);
        rewrite.MovedWrites.Add(call);
        rewrite.Moved(
            call.Syntax,
            $"{call.DisplayName} now replaces the content with {rewrite.Mutator}.UpdateBinaryDataElement."
        );
        if (!contentType.IsKind(SyntaxKind.NullLiteralExpression) && !IsOwnContentType(call))
        {
            rewrite.Moved(
                call.Syntax,
                $"UpdateBinaryDataElement throws when {contentType} is not the element's content type; v9 does not change an element's content type."
            );
        }
    }

    private static bool IsOwnContentType(StorageClientCall call) =>
        call.Written("contentType")?.Value is IPropertyReferenceOperation { Property.Name: "ContentType" } property
        && property.Instance?.Type?.ToDisplayString() == DataElementType;

    /// <summary>The read of the same element whose bytes the stream carries unchanged, if the stream is that.</summary>
    private sealed record OwnBytesRead(StorageClientCall BytesRead, IReadOnlyList<StatementSyntax> Carriers);

    /// <summary>
    /// The read of the same element whose bytes the stream carries unchanged, through a <c>new MemoryStream(bytes)</c>
    /// and locals, with the declarations of those locals that do nothing else.
    /// </summary>
    private static OwnBytesRead? OwnBytes(
        StorageClientCall call,
        IReadOnlyList<StorageClientCall> calls,
        IArgumentOperation stream
    )
    {
        var body = Root(call.Invocation);
        var carriers = new List<StatementSyntax>();
        var used = stream.Syntax;
        var value = Unwrapped(stream.Value);
        for (var hops = 0; hops < 3; hops++)
        {
            if (Symbol(value) is ILocalSymbol local && Initializer(body, local) is { } initializer)
            {
                if (
                    OnlyUse(body, local, used)
                    && initializer.Syntax.FirstAncestorOrSelf<LocalDeclarationStatementSyntax>()
                        is { Declaration.Variables.Count: 1 } declaration
                )
                {
                    carriers.Add(declaration);
                    used = declaration;
                }

                value = Unwrapped(initializer);
                continue;
            }

            if (
                value is IObjectCreationOperation { Arguments: [var bytes] } creation
                && creation.Type?.ToDisplayString() == MemoryStream
            )
            {
                value = Unwrapped(bytes.Value);
                continue;
            }

            break;
        }

        if (value is IAwaitOperation awaited)
        {
            value = Unwrapped(awaited.Operation);
        }

        return
            value is IInvocationOperation invocation
            && StorageClientCall.From(invocation)
                is { Name: "GetBinaryData" or "GetDataBytes" or "GetBinaryDataStream" } read
            && calls.Any(other => other.Syntax == read.Syntax)
            && SameElement(read, call)
            ? new OwnBytesRead(read, carriers)
            : null;
    }

    /// <summary>Whether every use of <paramref name="local"/> is inside <paramref name="user"/>.</summary>
    private static bool OnlyUse(IOperation body, ILocalSymbol local, SyntaxNode user) =>
        body.DescendantsAndSelf()
            .OfType<ILocalReferenceOperation>()
            .Where(reference =>
                SymbolEqualityComparer.Default.Equals(reference.Local, local) && !reference.IsDeclaration
            )
            .All(reference => user.Span.Contains(reference.Syntax.Span));

    private static IOperation? Initializer(IOperation body, ILocalSymbol local) =>
        body.DescendantsAndSelf()
            .OfType<IVariableDeclaratorOperation>()
            .FirstOrDefault(declarator => SymbolEqualityComparer.Default.Equals(declarator.Symbol, local))
            ?.Initializer?.Value;

    /// <summary>
    /// bytes(s): the bytes a <c>new MemoryStream(b)</c> wraps, <c>s.ToArray()</c> for a memory stream, or a copy into a
    /// new memory stream inserted before the statement; <c>null</c> when that copy cannot be awaited. The copy drains
    /// the stream, so the call must be known to move before this is asked: a call left as it is would send nothing.
    /// </summary>
    private static Piece? Bytes(MethodRewrite rewrite, IArgumentOperation stream, StatementSyntax statement)
    {
        var value = Unwrapped(stream.Value);
        var expression = StorageClientCall.Expression(stream) ?? (ExpressionSyntax)stream.Value.Syntax;
        if (
            value is IObjectCreationOperation { Arguments: [var bytes] } creation
            && creation.Type?.ToDisplayString() == MemoryStream
            && bytes.Value.Type is IArrayTypeSymbol
        )
        {
            return Piece.Of(bytes.Value.Syntax);
        }

        if (value.Type?.ToDisplayString() == MemoryStream)
        {
            return Piece.Expression("$0.ToArray()", Piece.Of(expression));
        }

        if (!rewrite.IsAsync)
        {
            return null;
        }

        var name = rewrite.FreshName(StreamName(expression) + "Buffer");
        rewrite.InsertBefore(
            statement,
            Piece.Statement($"using var {name} = new $0();", Piece.Type(MemoryStream)),
            Piece.Statement($"await $0.CopyToAsync({name});", Piece.Of(expression))
        );
        return Piece.Name(name + ".ToArray()");
    }

    private static string StreamName(ExpressionSyntax expression)
    {
        var last =
            expression.DescendantNodesAndSelf().OfType<IdentifierNameSyntax>().LastOrDefault()?.Identifier.ValueText
            ?? "stream";
        last = last.TrimStart('_');
        return last.Length == 0 ? "stream" : char.ToLowerInvariant(last[0]) + last[1..];
    }

    /// <summary>C-ML1 and C-ML2: a lock goes; an unlock goes when a write to the element follows, else it is a to-do.</summary>
    private void Lock(MethodRewrite rewrite, StorageClientCall call, IReadOnlyList<StorageClientCall> calls)
    {
        if (
            call.Name == "UnlockDataElement"
            && !calls.Any(other =>
                other.Syntax.SpanStart > call.Syntax.SpanStart
                && _elementWrites.Contains(other.Name)
                && SameElement(call, other)
            )
        )
        {
            rewrite.Todo(
                call.Syntax,
                $"unlocks {ElementName(call)} so that a later task can change it. Bind the data type to that task with "
                    + "taskIds in applicationmetadata.json instead."
            );
            return;
        }

        var id = ElementId(call);
        var result = id is null
            ? null
            : Piece.Expression("$0.GetDataElement($1)", Piece.Fixed(rewrite.MutatorExpression()), id);
        if (!Staged(rewrite, call, [], result, IsElementVariable))
        {
            return;
        }

        rewrite.Moved(
            call.Syntax,
            $"removed {call.DisplayName}: v9 unlocks a task's data when the task starts and locks it after the "
                + "task-end handlers."
        );
    }

    private static bool IsElementVariable(ISymbol? target) =>
        target switch
        {
            ILocalSymbol local => local.Type,
            IParameterSymbol parameter => parameter.Type,
            IFieldSymbol field => field.Type,
            IPropertySymbol property => property.Type,
            _ => null,
        }
            is { } type
        && type.ToDisplayString() == DataElementType;

    private static string ElementName(StorageClientCall call) =>
        StorageClientCall.Expression(call.Written("dataGuid", "dataId", "dataElement"))?.ToString() ?? "the element";

    private void InstanceClient(
        MethodRewrite rewrite,
        StorageClientCall call,
        CallTarget target,
        IReadOnlyList<StorageClientCall> calls
    )
    {
        switch (call.Name)
        {
            case "GetInstance":
                if (Read(rewrite, call, target))
                {
                    InstanceRead(rewrite, call, calls);
                }

                return;
            case "UpdateReadStatus":
                rewrite.Warn(
                    call.Syntax,
                    $"{call.DisplayName} has no mutator member; it still works while the process is transitioning."
                );
                return;
            case "UpdateProcess" or "UpdateProcessAndEvents":
                rewrite.Todo(
                    call.Syntax,
                    $"{call.DisplayName} moves the process from a process hook; v9 runs hooks inside the transition and refuses this."
                );
                return;
            case "CreateInstance":
                rewrite.Todo(
                    call.Syntax,
                    $"{call.DisplayName} writes to another instance (a new instance) from a process hook. The mutator "
                        + "covers only this instance, and the step may run more than once: make the call idempotent or "
                        + "move it out of the transition."
                );
                return;
            case "DeleteInstance":
                if (Write(rewrite, call, target, "autoDeleteOnProcessEnd"))
                {
                    Unported(
                        rewrite,
                        call,
                        "the mutator does not delete the instance; use autoDeleteOnProcessEnd in applicationmetadata.json"
                    );
                }

                return;
        }

        var member = call.Name switch
        {
            "AddCompleteConfirmation" => "AddCompleteConfirmation",
            "UpdateSubstatus" => "SetSubstatus",
            "UpdatePresentationTexts" => "SetPresentationText",
            "UpdateDataValues" or "UpdateDataValue" => "SetDataValue",
            _ => null,
        };
        if (member is null || !Write(rewrite, call, target, $"{rewrite.Mutator}.{member}"))
        {
            return;
        }

        switch (call.Name)
        {
            case "AddCompleteConfirmation":
                Confirmation(rewrite, call);
                break;
            case "UpdateSubstatus":
                Substatus(rewrite, call);
                break;
            case "UpdatePresentationTexts":
                Entries(rewrite, call, presentation: true);
                break;
            default:
                Entries(rewrite, call, presentation: false);
                break;
        }
    }

    /// <summary>C-RI1 and C-RI2: a re-read of the current instance is the mutator's instance, unless it looks for an element the hook added.</summary>
    private void InstanceRead(MethodRewrite rewrite, StorageClientCall call, IReadOnlyList<StorageClientCall> calls)
    {
        var addedBefore =
            rewrite.Added.Any(added => added.Add.Syntax.SpanStart < call.Syntax.SpanStart)
            || calls.Any(other => other.Syntax.SpanStart < call.Syntax.SpanStart && _adds.Contains(other.Name))
            || AddedOnTheWay(
                rewrite.Method,
                call.Syntax.SpanStart,
                new(SymbolEqualityComparer.Default),
                new(SymbolEqualityComparer.Default)
            );
        if (addedBefore)
        {
            rewrite.Todo(
                call.Syntax,
                $"{call.DisplayName} re-reads the instance to find an element added before it; the element exists only "
                    + "after the step is saved. Use what the hook added instead of reading it back."
            );
            return;
        }

        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        var instance = Piece.Expression("$0.Instance", mutator);
        var use = call.Use;
        if (
            use.Kind == CallUseKind.Assignment
            && use.Statement is { } statement
            && flow.Evaluate(TargetOperation(call)) is { IsCurrent: true, Part: InstancePart.Instance }
        )
        {
            rewrite.Edits.Remove(statement);
            rewrite.MovedReads.Add(call);
            rewrite.Moved(
                call.Syntax,
                $"removed {call.DisplayName}: {rewrite.Mutator}.Instance is the instance the transition changes."
            );
            return;
        }

        rewrite.Replace(use.Outer, instance);
        rewrite.MovedReads.Add(call);
        rewrite.Moved(call.Syntax, $"{call.DisplayName} now reads {rewrite.Mutator}.Instance.");
    }

    /// <summary>
    /// Whether an element may be added before <paramref name="position"/> in <paramref name="method"/> runs: a call
    /// before it there that adds, or that reaches an app method that adds, and the same before each call of the method
    /// on the way up its callers.
    /// </summary>
    private bool AddedOnTheWay(
        IMethodSymbol method,
        int position,
        HashSet<IMethodSymbol> visited,
        Dictionary<IMethodSymbol, bool> adds
    )
    {
        if (!visited.Add(method))
        {
            return false;
        }

        return reach.StorageCalls(method).Any(call => call.Syntax.SpanStart < position && _adds.Contains(call.Name))
            || reach
                .CallsFrom(method)
                .Any(site =>
                    site.Operation.Syntax.SpanStart < position
                    && Adds(site.Callee, new(SymbolEqualityComparer.Default), adds)
                )
            || reach
                .CallersOf(method)
                .Any(site => AddedOnTheWay(site.Caller, site.Operation.Syntax.SpanStart, visited, adds));
    }

    /// <summary>Whether <paramref name="method"/> adds an element, itself or in an app method it reaches.</summary>
    private bool Adds(IMethodSymbol method, HashSet<IMethodSymbol> visiting, Dictionary<IMethodSymbol, bool> known)
    {
        if (known.TryGetValue(method, out var adds))
        {
            return adds;
        }

        if (!visiting.Add(method))
        {
            return false;
        }

        adds =
            reach.StorageCalls(method).Any(call => _adds.Contains(call.Name))
            || reach.CallsFrom(method).Any(site => Adds(site.Callee, visiting, known));
        known[method] = adds;
        return adds;
    }

    private static IOperation? TargetOperation(StorageClientCall call) =>
        (call.Use.Statement as ExpressionStatementSyntax)?.Expression is AssignmentExpressionSyntax assignment
            ? call.Invocation.SemanticModel?.GetOperation(assignment.Left)
            : null;

    private static void Confirmation(MethodRewrite rewrite, StorageClientCall call)
    {
        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        if (!Staged(rewrite, call, [Piece.Statement("$0.AddCompleteConfirmation();", mutator)], null, static _ => true))
        {
            return;
        }

        rewrite.MovedWrites.Add(call);
        rewrite.Moved(
            call.Syntax,
            $"{call.DisplayName} now confirms the instance with {rewrite.Mutator}.AddCompleteConfirmation."
        );
        if (rewrite.InDataCreation)
        {
            rewrite.Moved(
                call.Syntax,
                "DataCreation also runs when an instance is created with data or a data element is posted; there the "
                    + "confirmation is refused before the save, so the request fails."
            );
        }
    }

    private static void Substatus(MethodRewrite rewrite, StorageClientCall call)
    {
        var substatus = call.Written("substatus");
        if (StorageClientCall.Expression(substatus) is not { } expression || EmptyLabel(substatus))
        {
            Unported(rewrite, call, "its substatus has no label, which the mutator refuses");
            return;
        }

        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        if (
            !Staged(
                rewrite,
                call,
                [Piece.Statement("$0.SetSubstatus($1);", mutator, Piece.Of(expression))],
                null,
                static _ => true
            )
        )
        {
            return;
        }

        rewrite.MovedWrites.Add(call);
        rewrite.Moved(call.Syntax, $"{call.DisplayName} now sets the substatus with {rewrite.Mutator}.SetSubstatus.");
        if (rewrite.InDataCreation)
        {
            rewrite.Moved(
                call.Syntax,
                "DataCreation also runs when an instance is created with data or a data element is posted; there the "
                    + "substatus is saved with the caller's token, which Storage accepts only from the app owner, so a "
                    + "user's request fails with 403, as v8's PUT did."
            );
        }
    }

    private static bool EmptyLabel(IArgumentOperation? substatus) =>
        substatus is not null
        && Unwrapped(substatus.Value) is IObjectCreationOperation { Initializer: { } initializer }
        && initializer
            .Initializers.OfType<ISimpleAssignmentOperation>()
            .Any(static assignment =>
                assignment.Target is IPropertyReferenceOperation { Property.Name: "Label" }
                && assignment.Value.ConstantValue is { HasValue: true, Value: null or "" }
            );

    /// <summary>
    /// C-ID1, C-ID2 and C-IP: one <c>SetDataValue</c> (<c>SetPresentationText</c>) per entry of a literal dictionary,
    /// per edit of <c>instance.DataValues</c>, or a loop over a dictionary variable.
    /// </summary>
    private void Entries(MethodRewrite rewrite, StorageClientCall call, bool presentation)
    {
        var member = presentation ? "SetPresentationText" : "SetDataValue";
        var derived = presentation ? fields.PresentationFields : fields.DataFields;
        var mutator = Piece.Fixed(rewrite.MutatorExpression());
        var statements = new List<Piece>();
        Action? alsoRemove = null;
        var dataValuesEdited = false;
        if (call.Name == "UpdateDataValue")
        {
            var key = call.Written("key");
            var value = call.Argument("value");
            if (
                key is null
                || value is null
                || StorageClientCall.Expression(key) is not { } keyExpression
                || StorageClientCall.Expression(value) is not { } valueExpression
            )
            {
                Unported(rewrite, call, "the upgrade did not recognize its arguments");
                return;
            }

            if (
                Entry(
                    rewrite,
                    call,
                    member,
                    derived,
                    key.Value,
                    value.Value,
                    Piece.Of(keyExpression),
                    Piece.Of(valueExpression),
                    mutator
                )
                is not { } single
            )
            {
                return;
            }

            statements.AddRange(single);
        }
        else
        {
            var argument = call.Written("presentationTexts", "dataValues");
            if (argument is null || StorageClientCall.Expression(argument) is not { } dictionaryExpression)
            {
                Unported(rewrite, call, "the upgrade did not recognize its arguments");
                return;
            }

            var dictionary = Unwrapped(argument.Value);
            var wrapped = dictionary.Type?.Name is "PresentationTexts" or "DataValues";
            if (DataValuesOfInstance(dictionary) && call.Name == "UpdateDataValues")
            {
                if (DataValuesEdits(rewrite, call, mutator, derived) is not { } edits)
                {
                    return;
                }

                alsoRemove = edits;
                dataValuesEdited = true;
            }
            else if (Literal(dictionary, wrapped) is { } literal)
            {
                foreach (var (key, value, keyNode, valueNode) in literal.Entries)
                {
                    if (
                        Entry(
                            rewrite,
                            call,
                            member,
                            derived,
                            key,
                            value,
                            Piece.Of(keyNode),
                            Piece.Of(valueNode),
                            mutator
                        )
                        is not { } entry
                    )
                    {
                        return;
                    }

                    statements.AddRange(entry);
                }

                if (literal.Declaration is { } declaration)
                {
                    alsoRemove = () => rewrite.Edits.Remove(declaration);
                }
            }
            else
            {
                var key = rewrite.FreshName("key");
                var value = rewrite.FreshName("value");
                var entries = presentation ? "Texts" : "Values";
                var source = wrapped
                    ? Piece.Expression($"$0.{entries}", Piece.Of(dictionaryExpression))
                    : Piece.Of(dictionaryExpression);
                statements.Add(
                    Piece.Statement(
                        $"foreach (var ({key}, {value}) in $0) {{ $1.{member}({key}, {value}); }}",
                        source,
                        mutator
                    )
                );
                if (derived.Count > 0)
                {
                    rewrite.Moved(
                        call.Syntax,
                        $"the keys set here are known only at run time; {member} throws for a key that "
                            + $"{(presentation ? "presentationFields" : "dataFields")} in applicationmetadata.json derives "
                            + $"({string.Join(", ", derived.Keys)}), which fails the step."
                    );
                }
            }
        }

        var result = Piece.Expression("$0.Instance", mutator);
        if (!Staged(rewrite, call, statements, result, target => IsCurrentInstanceVariable(call, target)))
        {
            return;
        }

        alsoRemove?.Invoke();
        rewrite.MovedWrites.Add(call);
        if (statements.Count == 0 && !dataValuesEdited)
        {
            return;
        }

        rewrite.Moved(
            call.Syntax,
            $"{call.DisplayName} now sets each {(presentation ? "text" : "value")} with {rewrite.Mutator}.{member}."
        );
    }

    private bool IsCurrentInstanceVariable(StorageClientCall call, ISymbol? target) =>
        target is not null && flow.Evaluate(TargetOperation(call)) is { IsCurrent: true, Part: InstancePart.Instance };

    /// <summary>
    /// One entry: <c>SetDataValue(key, value)</c>; for a key <c>dataFields</c> derives, nothing when the value is that
    /// field (C-ID2), else a to-do, since the mutator throws for it.
    /// </summary>
    private static IReadOnlyList<Piece>? Entry(
        MethodRewrite rewrite,
        StorageClientCall call,
        string member,
        IReadOnlyDictionary<string, string> derived,
        IOperation key,
        IOperation value,
        Piece keyPiece,
        Piece valuePiece,
        Piece mutator
    )
    {
        if (
            key.ConstantValue is { HasValue: true, Value: string constant }
            && derived.TryGetValue(constant, out var path)
        )
        {
            if (ModelPath(value) is { } valuePath && string.Equals(valuePath, path, StringComparison.OrdinalIgnoreCase))
            {
                rewrite.Moved(
                    call.Syntax,
                    $"dropped {constant}: {(member == "SetDataValue" ? "dataFields" : "presentationFields")} in applicationmetadata.json derives it from {path} already."
                );
                return [];
            }

            Unported(
                rewrite,
                call,
                $"it sets {(member == "SetDataValue" ? "data value" : "presentation text")} {constant}, which "
                    + $"{(member == "SetDataValue" ? "dataFields" : "presentationFields")} derives from {path}; v9 does not allow both. Remove one"
            );
            return null;
        }

        return [Piece.Statement($"$0.{member}($1, $2);", mutator, keyPiece, valuePiece)];
    }

    /// <summary>The model path a value reads, <c>A.B</c> for <c>model.A.B</c>.</summary>
    private static string? ModelPath(IOperation value)
    {
        var names = new List<string>();
        var current = Unwrapped(value);
        while (true)
        {
            switch (current)
            {
                case IPropertyReferenceOperation property when property.Instance is not null:
                    names.Insert(0, property.Property.Name);
                    current = Unwrapped(property.Instance);
                    continue;
                case IFieldReferenceOperation field when field.Instance is not null:
                    names.Insert(0, field.Field.Name);
                    current = Unwrapped(field.Instance);
                    continue;
                case IConditionalAccessOperation:
                    return null;
            }

            break;
        }

        return names.Count > 0 && current is ILocalReferenceOperation or IParameterReferenceOperation
            ? string.Join(".", names)
            : null;
    }

    private bool DataValuesOfInstance(IOperation dictionary) =>
        dictionary is IPropertyReferenceOperation { Property.Name: "DataValues" } property
        && flow.Evaluate(property.Instance) is { IsCurrent: true, Part: InstancePart.Instance };

    /// <summary>
    /// C-ID1 with <c>instance.DataValues</c>: each edit of it in the method before the call becomes a
    /// <c>SetDataValue</c>, its initialization goes, and so does the call. <c>null</c> (with a to-do) when an edit is of
    /// another kind or there is none.
    /// </summary>
    private Action? DataValuesEdits(
        MethodRewrite rewrite,
        StorageClientCall call,
        Piece mutator,
        IReadOnlyDictionary<string, string> derived
    )
    {
        var body = Root(call.Invocation);
        var edits = new List<(StatementSyntax Statement, Piece[]? Replacement)>();
        foreach (var reference in body.DescendantsAndSelf().OfType<IPropertyReferenceOperation>())
        {
            if (
                reference.Property.Name != "DataValues"
                || reference.Syntax.SpanStart >= call.Syntax.SpanStart
                || flow.Evaluate(reference.Instance) is not { IsCurrent: true, Part: InstancePart.Instance }
            )
            {
                continue;
            }

            var statement = reference.Syntax.FirstAncestorOrSelf<StatementSyntax>();
            switch (reference.Parent)
            {
                case IPropertyReferenceOperation
                {
                    Property.IsIndexer: true,
                    Parent: ISimpleAssignmentOperation assignment
                } indexer
                    when assignment.Target == indexer
                        && statement is ExpressionStatementSyntax
                        && indexer.Arguments is [var key]:
                    if (
                        Entry(
                            rewrite,
                            call,
                            "SetDataValue",
                            derived,
                            key.Value,
                            assignment.Value,
                            Piece.Of(key.Value.Syntax),
                            Piece.Of(assignment.Value.Syntax),
                            mutator
                        )
                        is not { } set
                    )
                    {
                        return null;
                    }

                    edits.Add((statement, [.. set]));
                    break;
                case IInvocationOperation { TargetMethod.Name: "Add", Arguments: [var key, var value] } add
                    when add.Instance == reference && statement is ExpressionStatementSyntax:
                    if (
                        Entry(
                            rewrite,
                            call,
                            "SetDataValue",
                            derived,
                            key.Value,
                            value.Value,
                            Piece.Of(key.Value.Syntax),
                            Piece.Of(value.Value.Syntax),
                            mutator
                        )
                        is not { } added
                    )
                    {
                        return null;
                    }

                    edits.Add((statement, [.. added]));
                    break;
                case IInvocationOperation { TargetMethod.Name: "Remove", Arguments: [var key] } remove
                    when remove.Instance == reference && statement is ExpressionStatementSyntax:
                    edits.Add(
                        (
                            statement,
                            [Piece.Statement("$0.SetDataValue($1, null);", mutator, Piece.Of(key.Value.Syntax))]
                        )
                    );
                    break;
                case IAssignmentOperation assignment
                    when assignment.Target == reference && statement is ExpressionStatementSyntax:
                    edits.Add((statement, null));
                    break;
                case IPropertyReferenceOperation { Property.IsIndexer: true }:
                case IInvocationOperation { TargetMethod.Name: "ContainsKey" or "TryGetValue" or "GetValueOrDefault" }:
                    break;
                default:
                    if (reference.Parent is IArgumentOperation argument && call.Invocation.Arguments.Contains(argument))
                    {
                        break;
                    }

                    Unported(rewrite, call, "it sends instance.DataValues, whose changes the upgrade could not follow");
                    return null;
            }
        }

        if (!edits.Any(static edit => edit.Replacement is not null))
        {
            Unported(rewrite, call, "it sends instance.DataValues, whose changes the upgrade could not follow");
            return null;
        }

        return () =>
        {
            foreach (var (statement, replacement) in edits)
            {
                if (replacement is null)
                {
                    rewrite.Edits.Remove(statement);
                }
                else
                {
                    rewrite.ReplaceStatement(statement, replacement);
                }
            }
        };
    }

    private sealed record LiteralEntries(
        IReadOnlyList<(IOperation Key, IOperation Value, SyntaxNode KeyNode, SyntaxNode ValueNode)> Entries,
        StatementSyntax? Declaration
    );

    /// <summary>
    /// The entries of a literal dictionary (<c>{ k, v }</c> or <c>[k] = v</c>), wrapped in <c>new PresentationTexts { Texts = … }</c>
    /// or <c>new DataValues { Values = … }</c> when <paramref name="wrapped"/>; or of a local initialized that way and used once.
    /// </summary>
    private static LiteralEntries? Literal(IOperation dictionary, bool wrapped)
    {
        StatementSyntax? declaration = null;
        if (dictionary is ILocalReferenceOperation local)
        {
            var body = Root(dictionary);
            var references = body.DescendantsAndSelf()
                .OfType<ILocalReferenceOperation>()
                .Count(reference =>
                    SymbolEqualityComparer.Default.Equals(reference.Local, local.Local) && !reference.IsDeclaration
                );
            if (references != 1 || Initializer(body, local.Local) is not { } initializer)
            {
                return null;
            }

            declaration = initializer.Syntax.FirstAncestorOrSelf<LocalDeclarationStatementSyntax>();
            if (declaration is not LocalDeclarationStatementSyntax { Declaration.Variables.Count: 1 })
            {
                return null;
            }

            dictionary = Unwrapped(initializer);
        }

        if (wrapped)
        {
            if (
                dictionary
                is not IObjectCreationOperation
                {
                    Initializer.Initializers: [
                        ISimpleAssignmentOperation { Target: IPropertyReferenceOperation, Value: var inner },
                    ]
                }
            )
            {
                return null;
            }

            dictionary = Unwrapped(inner);
        }

        if (dictionary is not IObjectCreationOperation { Arguments.Length: 0 } creation)
        {
            return null;
        }

        var entries = new List<(IOperation, IOperation, SyntaxNode, SyntaxNode)>();
        foreach (var element in creation.Initializer?.Initializers ?? [])
        {
            switch (element)
            {
                case IInvocationOperation { TargetMethod.Name: "Add", Arguments: [var key, var value] }:
                    entries.Add((key.Value, value.Value, key.Value.Syntax, value.Value.Syntax));
                    break;
                case ISimpleAssignmentOperation
                {
                    Target: IPropertyReferenceOperation { Arguments: [var key] },
                    Value: var value
                }:
                    entries.Add((key.Value, value, key.Value.Syntax, value.Syntax));
                    break;
                default:
                    return null;
            }
        }

        return new LiteralEntries(entries, declaration);
    }

    private void DataService(MethodRewrite rewrite, StorageClientCall call, CallTarget target)
    {
        var reads = call.Name is "GetByType" or "GetById";
        if (
            reads
                ? !Read(rewrite, call, target)
                : !Write(rewrite, call, target, $"{rewrite.Mutator}.{DataServiceMember(call.Name)}")
        )
        {
            return;
        }

        if (reads)
        {
            UnportedRead(rewrite, call, $"the upgrade has no rewrite of {call.DisplayName}");
            return;
        }

        Unported(
            rewrite,
            call,
            $"the upgrade has no rewrite of {call.DisplayName}, which no app used in a process hook"
        );
    }

    /// <summary>The read stays as it is, which works while the process is transitioning, with a warning that says why.</summary>
    private static void UnportedRead(MethodRewrite rewrite, StorageClientCall call, string reason) =>
        rewrite.Warn(
            call.Syntax,
            $"{call.DisplayName} still reads Storage directly in {rewrite.Entry.Name}: {reason}. The read works while the "
                + "process is transitioning, but it does not see what the step changed before it."
        );

    private static string DataServiceMember(string name) =>
        name switch
        {
            "DeleteById" => "RemoveDataElement",
            "InsertJsonObject" => "AddBinaryDataElement",
            _ => "UpdateBinaryDataElement",
        };

    /// <summary>The write stays as it is, with a to-do that says why.</summary>
    private static void Unported(MethodRewrite rewrite, StorageClientCall call, string reason) =>
        rewrite.Todo(
            call.Syntax,
            $"{call.DisplayName} still writes to Storage directly in {rewrite.Entry.Name}, which v9 refuses while the "
                + $"process is transitioning: {reason}."
        );

    /// <summary>
    /// A form add that an entry reaching <paramref name="write"/> runs too, of the data type the write's element
    /// may have (by its <c>DataType == "…"</c> lookup), so that the write may target the added element.
    /// </summary>
    private FormAdd? EarlierFormAdd(MethodRewrite rewrite, StorageClientCall write)
    {
        var written = Element(write) is { } element ? LookedUpDataType(element) : null;
        return formAdds.FirstOrDefault(earlier =>
            earlier.Add.Syntax != write.Syntax
            && rewrite.Entries.Contains(earlier.Entry)
            && (
                written is null
                || earlier.Add.Written("dataType", "dataTypeString", "dataTypeId")?.Value.ConstantValue
                    is not { HasValue: true, Value: string added }
                || added == written
            )
        );
    }

    /// <summary>The data type an element local was looked up by, as in <c>Data.First(d => d.DataType == "x")</c>.</summary>
    private static string? LookedUpDataType(IOperation element)
    {
        if (element is not ILocalReferenceOperation local || Initializers(Root(element), local.Local) is not [var only])
        {
            return null;
        }

        return only.DescendantsAndSelf()
            .OfType<IBinaryOperation>()
            .Where(static comparison => comparison.OperatorKind == BinaryOperatorKind.Equals)
            .SelectMany(static comparison =>
                new[]
                {
                    (comparison.LeftOperand, comparison.RightOperand),
                    (comparison.RightOperand, comparison.LeftOperand),
                }
            )
            .Where(static pair => Unwrapped(pair.Item1) is IPropertyReferenceOperation { Property.Name: "DataType" })
            .Select(static pair =>
                pair.Item2.ConstantValue is { HasValue: true, Value: string dataType } ? dataType : null
            )
            .FirstOrDefault(static dataType => dataType is not null);
    }

    /// <summary>The element added earlier in the method that the call's element argument is.</summary>
    private static AddedElement? AddedElement(MethodRewrite rewrite, StorageClientCall call)
    {
        var element = Element(call);
        if (element is null)
        {
            return null;
        }

        var symbol = Symbol(element);
        return rewrite.Added.FirstOrDefault(added => SymbolEqualityComparer.Default.Equals(added.Local, symbol));
    }

    /// <summary>
    /// The operation naming the call's element: the <c>DataElement</c> argument, or the element whose id a
    /// <c>Guid.Parse(el.Id)</c> or <c>new Guid(el.Id)</c> argument parses, or the guid itself.
    /// </summary>
    private static IOperation? Element(StorageClientCall call)
    {
        if (call.Argument("dataElement")?.Value is { } element)
        {
            return Unwrapped(element);
        }

        var id = call.Argument("dataId", "dataGuid", "dataElementId")?.Value;
        if (id is null)
        {
            return null;
        }

        id = Unwrapped(id);
        if (ParsedElementId(id) is { } parsed)
        {
            return parsed;
        }

        // A guid local made once from an element's id names that element.
        if (
            id is ILocalReferenceOperation local
            && Initializers(Root(id), local.Local) is [var only]
            && ParsedElementId(Unwrapped(only)) is { } fromLocal
        )
        {
            return fromLocal;
        }

        return id;
    }

    /// <summary>What the method assigns to a local, its declaration's value included.</summary>
    private static List<IOperation> Initializers(IOperation body, ILocalSymbol local) =>
        [
            .. body.DescendantsAndSelf()
                .Select(operation =>
                    operation switch
                    {
                        IVariableDeclaratorOperation declarator
                            when SymbolEqualityComparer.Default.Equals(declarator.Symbol, local) => declarator
                            .Initializer
                            ?.Value,
                        ISimpleAssignmentOperation { Target: ILocalReferenceOperation target } assignment
                            when SymbolEqualityComparer.Default.Equals(target.Local, local) => assignment.Value,
                        _ => null,
                    }
                )
                .OfType<IOperation>(),
        ];

    private static IOperation? ParsedElementId(IOperation id)
    {
        var parsed = id switch
        {
            IInvocationOperation { TargetMethod.Name: "Parse", Arguments: [var text] } parse
                when parse.TargetMethod.ContainingType.ToDisplayString() == "System.Guid" => text.Value,
            IObjectCreationOperation { Arguments: [var text] } creation
                when creation.Type?.ToDisplayString() == "System.Guid" => text.Value,
            _ => null,
        };
        return
            parsed is not null
            && Unwrapped(parsed) is IPropertyReferenceOperation { Property.Name: "Id", Instance: { } owner }
            && owner.Type?.ToDisplayString() == DataElementType
            ? Unwrapped(owner)
            : null;
    }

    /// <summary>id(x): the element as the mutator takes it.</summary>
    private static Piece? ElementId(StorageClientCall call)
    {
        if (
            call.Written("dataElement") is { } element
            && StorageClientCall.Expression(element) is { } elementExpression
        )
        {
            return Piece.Of(elementExpression);
        }

        var id = call.Written("dataId", "dataGuid", "dataElementId");
        if (StorageClientCall.Expression(id) is not { } idExpression || id is null)
        {
            return null;
        }

        if (ParsedElementId(Unwrapped(id.Value)) is { Syntax: ExpressionSyntax owner })
        {
            return Piece.Of(owner);
        }

        return Piece.Expression("new $0($1)", Piece.Type(DataElementIdentifier), Piece.Of(idExpression));
    }

    /// <summary>Whether two calls name the same data element.</summary>
    private static bool SameElement(StorageClientCall left, StorageClientCall right) =>
        Element(left) is { } l
        && Element(right) is { } r
        && (
            Symbol(l) is { } ls && Symbol(r) is { } rs && SymbolEqualityComparer.Default.Equals(ls, rs)
            || l.Syntax.IsEquivalentTo(r.Syntax)
        );

    private static ISymbol? Symbol(IOperation? operation) =>
        operation switch
        {
            ILocalReferenceOperation local => local.Local,
            IParameterReferenceOperation parameter => parameter.Parameter,
            IFieldReferenceOperation field => field.Field,
            IPropertyReferenceOperation property when property.Instance is null or IInstanceReferenceOperation =>
                property.Property,
            _ => null,
        };

    /// <summary>
    /// C-WA1: the model is a local the method declares, not used after the call (in a loop, nowhere else in it) except
    /// to write it to the element the call added (C-WF3).
    /// </summary>
    private static bool IsLocalUnusedAfter(IOperation model, StorageClientCall call)
    {
        if (Unwrapped(model) is not ILocalReferenceOperation local || call.Use.Statement is not { } statement)
        {
            return false;
        }

        var body = Root(call.Invocation);
        var declaration = body.DescendantsAndSelf()
            .OfType<IVariableDeclaratorOperation>()
            .FirstOrDefault(declarator => SymbolEqualityComparer.Default.Equals(declarator.Symbol, local.Local));
        if (declaration is null)
        {
            return false;
        }

        var loop = statement
            .Ancestors()
            .FirstOrDefault(static ancestor =>
                ancestor
                    is ForStatementSyntax
                        or CommonForEachStatementSyntax
                        or WhileStatementSyntax
                        or DoStatementSyntax
            );
        var references = body.DescendantsAndSelf()
            .OfType<ILocalReferenceOperation>()
            .Where(reference =>
                SymbolEqualityComparer.Default.Equals(reference.Local, local.Local)
                && !reference.IsDeclaration
                && reference != Unwrapped(model)
                && !IsWriteToAdded(reference, call)
            );
        return references.All(reference =>
            reference.Syntax.SpanStart < statement.SpanStart
            && (
                loop is null
                || !loop.Span.Contains(reference.Syntax.Span)
                || loop.Span.Contains(declaration.Syntax.Span)
            )
        );
    }

    /// <summary>The model of a later <c>UpdateFormData</c> whose element is the one <paramref name="add"/> returned.</summary>
    private static bool IsWriteToAdded(ILocalReferenceOperation reference, StorageClientCall add)
    {
        var parent = reference.Parent;
        while (parent is IConversionOperation or IParenthesizedOperation)
        {
            parent = parent.Parent;
        }

        if (
            add.Use is not { Kind: CallUseKind.Declaration, Target: ILocalSymbol added }
            || parent is not IArgumentOperation { Parent: IInvocationOperation invocation } argument
            || StorageClientCall.From(invocation) is not { Name: "UpdateFormData" } write
            || write.Argument("dataToSerialize") != argument
        )
        {
            return false;
        }

        return Element(write) is { } element && SymbolEqualityComparer.Default.Equals(Symbol(element), added);
    }

    private static IOperation Unwrapped(IOperation operation)
    {
        while (true)
        {
            switch (operation)
            {
                case IConversionOperation conversion:
                    operation = conversion.Operand;
                    continue;
                case IParenthesizedOperation parenthesized:
                    operation = parenthesized.Operand;
                    continue;
                case IArgumentOperation argument:
                    operation = argument.Value;
                    continue;
                default:
                    return operation;
            }
        }
    }

    private static IOperation Root(IOperation operation)
    {
        var root = operation;
        while (root.Parent is { } parent)
        {
            root = parent;
        }

        return root;
    }
}
