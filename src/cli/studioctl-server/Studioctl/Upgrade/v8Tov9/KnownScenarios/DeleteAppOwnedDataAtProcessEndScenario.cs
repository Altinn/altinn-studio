using System.Collections.Immutable;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;

/// <summary>
/// Deletes an <c>IProcessEnd</c> implementation whose only work is to delete the element of one or more app-owned data
/// types when the process ends, and sets <c>autoDeleteOnProcessEnd</c> on those data types in applicationmetadata.json
/// instead. v9 refuses a delete from a process-end hook for a data type bound to a task, since no task is current
/// then, and itself deletes the elements of every data type with <c>autoDeleteOnProcessEnd</c> once the process has
/// ended.
/// </summary>
/// <remarks>
/// <para>
/// The match is a hook class the upgrade can delete (<see cref="RemovableHook"/>) that implements <c>IProcessEnd</c>,
/// whose <c>End</c> holds nothing but these statements, in any order and in any number: a local holding one of the
/// values below; <c>if (element != null) …</c> without an <c>else</c>, on a local holding
/// <c>instance.Data.FirstOrDefault(d =&gt; d.DataType == X)</c>; <c>await Helper(…);</c>, where every argument is one
/// of the values below; and
/// <c>await _dataClient.DeleteData(partyId, instanceGuid, new Guid(element.Id), false);</c> on an <c>IDataClient</c>
/// field or primary constructor parameter of the class, also with the <c>org</c> and <c>app</c> arguments of the older
/// overload. The values are the instance; X, a string constant; <c>int.Parse(instance.InstanceOwner.PartyId)</c>;
/// <c>new InstanceIdentifier(instance)</c> and its <c>InstanceGuid</c>; <c>new Guid(instance.Id.Split("/")[1])</c>;
/// <c>(await _appMetadata.GetApplicationMetadata()).AppIdentifier</c> on an <c>IAppMetadata</c> field or parameter, and
/// its <c>Org</c> and <c>App</c>; the <c>FirstOrDefault</c> above; and, inside its <c>if</c>,
/// <c>instance.Data.First(d =&gt; d.DataType == X)</c>. The element's <c>Id</c> is read only inside its <c>if</c>, so
/// the hook never fails for an instance without it. The helper
/// runs the same statements, with its parameters holding the arguments, and does not call itself. The hook deletes at
/// least one data type.
/// </para>
/// <para>
/// In applicationmetadata.json, each data type X is one data type that only the app may change,
/// <c>"allowedContributers": ["app:owned"]</c> in either spelling, with <c>maxCount</c> 1, a <c>taskId</c>, and
/// <c>"autoDeleteOnProcessEnd": false</c> in its <c>appLogic</c>, which is set to <c>true</c> in the text of the file.
/// A hook with a data type that does not fit is left alone, and so is a data type deleted twice, by one hook or two,
/// with its hooks. Anything else is left alone, without a message.
/// </para>
/// <para>
/// The data type's setting does what the hook did: with <c>maxCount</c> 1 the element the hook found is every element
/// of the data type, and v9 deletes it at process end, as v8's delete without delay did. v9 deletes it after the
/// process-ended handlers rather than among them, so another handler of the app still finds it.
/// </para>
/// <para>
/// Seen in <c>nkr/fastbudsjett</c>, <c>nkr/fastmuseumsstatistikk</c>, <c>nkr/fastregnskapsrapportering</c> and
/// <c>nkr/faststatistikk</c>, on library versions 8.8.2 and 8.9.2, in a survey of production apps from 2026-10-20 to
/// 2026-10-26: each deletes its app-owned copy of the form, bound to Task_1, when the process ends.
/// </para>
/// </remarks>
internal sealed class DeleteAppOwnedDataAtProcessEndScenario : IKnownScenario
{
    private const string DataClientName = "Altinn.App.Core.Internal.Data.IDataClient";
    private const string AppMetadataName = "Altinn.App.Core.Internal.App.IAppMetadata";
    private const string InstanceIdentifierName = "Altinn.App.Core.Models.InstanceIdentifier";

    public MigrationResult Apply(CSharpSourceScanner scanner, string projectFolder)
    {
        var files = scanner.Files.ToArray();
        var registrations = HookRegistrations.Find(files, [HookFamily.ProcessEnded]);
        var hooks = HookImplementation
            .Find(HookFamily.ProcessEnded, files)
            .Select(hook => RemovableHook.Of(hook, files, registrations))
            .OfType<RemovableHook>()
            .Select(DeletingHook.Of)
            .OfType<DeletingHook>()
            .ToList();
        var sharedDataTypes = hooks
            .SelectMany(static hook => hook.Deletes)
            .GroupBy(static dataType => dataType, StringComparer.Ordinal)
            .Where(static group => group.Count() > 1)
            .Select(static group => group.Key)
            .ToHashSet(StringComparer.Ordinal);
        hooks.RemoveAll(hook => hook.Deletes.Any(sharedDataTypes.Contains));
        if (hooks.Count == 0 || ApplicationMetadataText.Read(projectFolder) is not { } metadata)
        {
            return new MigrationResult();
        }

        var matches = new List<(DeletingHook Hook, IReadOnlyList<AutoDelete> AutoDeletes)>();
        foreach (var hook in hooks)
        {
            var autoDeletes = hook.Deletes.Select(dataType => AutoDelete.Of(metadata, dataType)).ToList();
            if (autoDeletes.TrueForAll(static autoDelete => autoDelete is not null))
            {
                matches.Add((hook, [.. autoDeletes.OfType<AutoDelete>()]));
            }
        }

        if (matches.Count == 0)
        {
            return new MigrationResult();
        }

        metadata.Write(matches.SelectMany(match => match.AutoDeletes.Select(autoDelete => autoDelete.Edit(metadata))));
        RemovableHook.Remove(scanner, [.. matches.Select(static match => match.Hook.Removable)]);
        return new MigrationResult([
            .. matches
                .OrderBy(static match => match.Hook.Removable.Path, StringComparer.Ordinal)
                .SelectMany(static match => match.AutoDeletes.Select(Set).Append(Deleted(match.Hook))),
        ]);
    }

    private static UpgradeMessage Set(AutoDelete autoDelete) =>
        new(
            $"Set autoDeleteOnProcessEnd on data type {autoDelete.DataType} in {ApplicationMetadataText.RelativePath}: "
                + $"v9 refuses the hook's delete at process end for a type bound to {autoDelete.TaskId}, and deletes the "
                + "data itself when the process has ended.",
            UpgradeMessageStatus.Warning
        );

    private static UpgradeMessage Deleted(DeletingHook hook) =>
        new(
            $"Deleted {hook.Removable.Path}, whose only work was {(hook.Deletes.Count == 1 ? "that delete" : "those deletes")}, "
                + $"and its registration in {hook.Removable.RegistrationLocation}.",
            UpgradeMessageStatus.Ok
        );

    /// <summary>
    /// Setting <c>autoDeleteOnProcessEnd</c> on a data type the hook deletes: the data type's position in
    /// <c>dataTypes</c>, the names of its <c>appLogic</c> and <c>autoDeleteOnProcessEnd</c> properties as the file
    /// spells them, and the task it is bound to.
    /// </summary>
    private sealed record AutoDelete(string DataType, int Index, string AppLogicName, string FlagName, string TaskId)
    {
        public static AutoDelete? Of(ApplicationMetadataText metadata, string id)
        {
            if (
                metadata.DataType(id) is not var (dataType, index)
                || !IsAppOwned(dataType)
                || ApplicationMetadataText.Single(dataType, "maxCount") is not { Value: JsonValue maxCount }
                || !maxCount.TryGetValue(out int count)
                || count != 1
                || ApplicationMetadataText.Single(dataType, "taskId") is not { Value: JsonValue taskIdValue }
                || !taskIdValue.TryGetValue(out string? taskId)
                || taskId is not { Length: > 0 }
                || ApplicationMetadataText.Single(dataType, "appLogic")
                    is not { Value: JsonObject appLogic, Key: var appLogicName }
                || ApplicationMetadataText.Single(appLogic, "autoDeleteOnProcessEnd")
                    is not { Value: JsonValue flag, Key: var flagName }
                || flag.GetValueKind() != JsonValueKind.False
            )
            {
                return null;
            }

            return new AutoDelete(id, index, appLogicName, flagName, taskId);
        }

        /// <summary>The edit that replaces the data type's <c>"autoDeleteOnProcessEnd": false</c> with <c>true</c>.</summary>
        public (int Start, int End, string Replacement) Edit(ApplicationMetadataText metadata)
        {
            var (_, _, valueStart, valueEnd) = metadata.Locate(Index, AppLogicName, FlagName);
            return (valueStart, valueEnd, "true");
        }

        /// <summary>Whether only the app may change the data type's elements, in either spelling of the property.</summary>
        private static bool IsAppOwned(JsonObject dataType) =>
            ApplicationMetadataText
                .Named(dataType, "allowedContributers")
                .Concat(ApplicationMetadataText.Named(dataType, "allowedContributors"))
                .ToList()
                is [{ Value: JsonArray { Count: 1 } contributors }]
            && contributors[0] is JsonValue contributor
            && contributor.TryGetValue(out string? name)
            && name == "app:owned";
    }

    /// <summary>A matched hook and the data types it deletes, in the order of the deletes.</summary>
    private sealed record DeletingHook(RemovableHook Removable, IReadOnlyList<string> Deletes)
    {
        public static DeletingHook? Of(RemovableHook removable)
        {
            if (removable.Hook.Method.Parameters is not [var instance, _])
            {
                return null;
            }

            var end = new EndBody(removable);
            var values = new Dictionary<ISymbol, Value>(SymbolEqualityComparer.Default)
            {
                [instance] = new(ValueKind.Instance),
            };
            return end.Run([.. removable.Body.Statements], values, [], inHelper: false) && end.Deletes.Count > 0
                ? new DeletingHook(removable, end.Deletes)
                : null;
        }
    }

    private enum ValueKind
    {
        Instance,
        DataTypeId,
        PartyId,
        InstanceIdentifier,
        InstanceGuid,
        AppIdentifier,
        Org,
        App,

        /// <summary>The first element of a data type, or <c>null</c> when the instance has none.</summary>
        Element,
        ElementGuid,
    }

    /// <summary>What an expression of the hook holds; <see cref="DataType"/> is set for the kinds about a data type.</summary>
    private readonly record struct Value(ValueKind Kind, string? DataType = null);

    /// <summary>Runs the statements of <c>End</c> and its helper symbolically, collecting the deletes.</summary>
    private sealed class EndBody(RemovableHook hook)
    {
        private readonly SemanticModel _model = hook.Model;

        public List<string> Deletes { get; } = [];

        /// <summary>
        /// Whether the statements are all of the scenario's kinds; <paramref name="present"/> holds the data types
        /// whose element an enclosing <c>if</c> found.
        /// </summary>
        public bool Run(
            IReadOnlyList<StatementSyntax> statements,
            Dictionary<ISymbol, Value> values,
            ImmutableHashSet<string> present,
            bool inHelper
        )
        {
            foreach (var statement in statements)
            {
                var ran = statement switch
                {
                    LocalDeclarationStatementSyntax
                    {
                        Declaration.Variables: [{ Initializer.Value: var initializer } variable],
                    } => _model.GetDeclaredSymbol(variable) is { } local
                        && ValueOf(_model.GetOperation(initializer), values, present) is { } value
                        && values.TryAdd(local, value),
                    IfStatementSyntax
                    {
                        Else: null,
                        Condition: BinaryExpressionSyntax
                        {
                            RawKind: (int)SyntaxKind.NotEqualsExpression,
                            Right: LiteralExpressionSyntax { RawKind: (int)SyntaxKind.NullLiteralExpression },
                        } condition,
                    } ifStatement => _model.GetOperation(condition.Left) is ILocalReferenceOperation element
                        && values.GetValueOrDefault(element.Local) is { Kind: ValueKind.Element, DataType: { } id }
                        && Run(
                            ifStatement.Statement is BlockSyntax block
                                ? [.. block.Statements]
                                : [ifStatement.Statement],
                            values,
                            present.Add(id),
                            inHelper
                        ),
                    ExpressionStatementSyntax { Expression: AwaitExpressionSyntax { Expression: var awaited } } =>
                        _model.GetOperation(awaited) is IInvocationOperation call
                            && (IsDelete(call, values, present) || RunsHelper(call, values, present, inHelper)),
                    _ => false,
                };
                if (!ran)
                {
                    return false;
                }
            }

            return true;
        }

        /// <summary>
        /// Whether the call is <c>await _dataClient.DeleteData(…)</c> of a data type's element without delay; it
        /// records the delete. Of the <c>IDataClient</c> members, only <c>DeleteData</c> and <c>DeleteBinaryData</c>,
        /// which is <c>DeleteData</c> without delay, have these parameters.
        /// </summary>
        private bool IsDelete(
            IInvocationOperation call,
            Dictionary<ISymbol, Value> values,
            ImmutableHashSet<string> present
        )
        {
            if (call.TargetMethod.ContainingType.ToDisplayString() != DataClientName || !IsDependency(call.Instance))
            {
                return false;
            }

            string? dataType = null;
            foreach (var argument in call.Arguments)
            {
                ValueKind? kind = argument.Parameter?.Name switch
                {
                    "org" => ValueKind.Org,
                    "app" => ValueKind.App,
                    "instanceOwnerPartyId" => ValueKind.PartyId,
                    "instanceGuid" => ValueKind.InstanceGuid,
                    "dataGuid" => ValueKind.ElementGuid,
                    _ => null,
                };
                if (kind is null)
                {
                    var expected =
                        argument.Parameter?.Name == "delay"
                            ? argument.Value.ConstantValue is { HasValue: true, Value: false }
                            : argument.ArgumentKind == ArgumentKind.DefaultValue;
                    if (!expected)
                    {
                        return false;
                    }
                }
                else if (ValueOf(argument.Value, values, present) is not { } value || value.Kind != kind)
                {
                    return false;
                }
                else if (kind == ValueKind.ElementGuid)
                {
                    dataType = value.DataType;
                }
            }

            if (dataType is null)
            {
                return false;
            }

            Deletes.Add(dataType);
            return true;
        }

        /// <summary>Whether the call is <c>await Helper(…);</c> from <c>End</c> and the helper runs.</summary>
        private bool RunsHelper(
            IInvocationOperation call,
            Dictionary<ISymbol, Value> values,
            ImmutableHashSet<string> present,
            bool inHelper
        )
        {
            if (
                inHelper
                || hook.Helper is not ({ } declaration, { } body)
                || !Equal(call.TargetMethod, _model.GetDeclaredSymbol(declaration))
            )
            {
                return false;
            }

            var parameters = new Dictionary<ISymbol, Value>(SymbolEqualityComparer.Default);
            foreach (var argument in call.Arguments)
            {
                if (
                    argument.Parameter is not { } parameter
                    || argument.ArgumentKind != ArgumentKind.Explicit
                    || ValueOf(argument.Value, values, present) is not { } value
                )
                {
                    return false;
                }

                parameters[parameter] = value;
            }

            return Run([.. body.Statements], parameters, present, inHelper: true);
        }

        /// <summary>What the expression holds, or <c>null</c> when it is none of the scenario's values.</summary>
        private Value? ValueOf(
            IOperation? operation,
            Dictionary<ISymbol, Value> values,
            ImmutableHashSet<string> present
        )
        {
            operation = WithoutConversions(operation);
            if (operation?.ConstantValue is { HasValue: true, Value: string id })
            {
                return new Value(ValueKind.DataTypeId, id);
            }

            return operation switch
            {
                IParameterReferenceOperation parameter => values.TryGetValue(parameter.Parameter, out var value)
                    ? value
                    : null,
                ILocalReferenceOperation local => values.TryGetValue(local.Local, out var value) ? value : null,
                IInvocationOperation
                {
                    TargetMethod: { Name: "Parse", ContainingType.SpecialType: SpecialType.System_Int32 },
                    Arguments: [{ Value: IPropertyReferenceOperation { Property.Name: "PartyId" } partyId }],
                }
                    when WithoutConversions(partyId.Instance) is IPropertyReferenceOperation owner
                        && Holds(owner.Instance, ValueKind.Instance, values, present) => new Value(ValueKind.PartyId),
                IObjectCreationOperation
                {
                    Constructor.ContainingType: var identifier,
                    Arguments: [{ Value: var instance }],
                }
                    when identifier.ToDisplayString() == InstanceIdentifierName
                        && Holds(instance, ValueKind.Instance, values, present) => new Value(
                    ValueKind.InstanceIdentifier
                ),
                IPropertyReferenceOperation instanceGuid
                    when Holds(instanceGuid.Instance, ValueKind.InstanceIdentifier, values, present) => new Value(
                    ValueKind.InstanceGuid
                ),
                IObjectCreationOperation { Arguments: [{ Value: var text }] } => GuidOf(text, values, present),
                IPropertyReferenceOperation
                {
                    Instance: IAwaitOperation
                    {
                        Operation: IInvocationOperation { TargetMethod.ContainingType: var appMetadata } read,
                    },
                } when appMetadata.ToDisplayString() == AppMetadataName && IsDependency(read.Instance) => new Value(
                    ValueKind.AppIdentifier
                ),
                IPropertyReferenceOperation { Property.Name: "Org" } org
                    when Holds(org.Instance, ValueKind.AppIdentifier, values, present) => new Value(ValueKind.Org),
                IPropertyReferenceOperation { Property.Name: "App" } app
                    when Holds(app.Instance, ValueKind.AppIdentifier, values, present) => new Value(ValueKind.App),
                IInvocationOperation
                {
                    TargetMethod: { Name: "FirstOrDefault" or "First" } first,
                    Arguments: [{ Value: var data }, { Value: var predicate }],
                }
                    when first.ContainingType.ToDisplayString() == "System.Linq.Enumerable"
                        && WithoutConversions(data) is IPropertyReferenceOperation elements
                        && Holds(elements.Instance, ValueKind.Instance, values, present)
                        && FilteredDataType(predicate, values, present) is { } dataType
                        && (first.Name == "FirstOrDefault" || present.Contains(dataType)) => new Value(
                    ValueKind.Element,
                    dataType
                ),
                _ => null,
            };
        }

        /// <summary>
        /// What the text a <c>Guid</c> is made from holds: an element's <c>Id</c> inside the <c>if</c> that found it, or
        /// <c>instance.Id.Split("/")[1]</c>.
        /// </summary>
        private Value? GuidOf(IOperation text, Dictionary<ISymbol, Value> values, ImmutableHashSet<string> present) =>
            WithoutConversions(text) switch
            {
                IPropertyReferenceOperation { Property.Name: "Id" } id
                    when ValueOf(id.Instance, values, present) is { Kind: ValueKind.Element, DataType: { } dataType }
                        && present.Contains(dataType) => new Value(ValueKind.ElementGuid, dataType),
                IArrayElementReferenceOperation
                {
                    ArrayReference: IInvocationOperation
                    {
                        TargetMethod.Name: "Split",
                        Instance: IPropertyReferenceOperation { Property.Name: "Id" } id,
                    } split,
                    Indices: [{ ConstantValue: { HasValue: true, Value: 1 } }],
                }
                    when Holds(id.Instance, ValueKind.Instance, values, present)
                        && split.Arguments.All(static argument =>
                            argument.ArgumentKind == ArgumentKind.DefaultValue
                            || argument.Value.ConstantValue is { HasValue: true, Value: "/" }
                        ) => new Value(ValueKind.InstanceGuid),
                _ => null,
            };

        /// <summary>The X of <c>d =&gt; d.DataType == X</c>.</summary>
        private string? FilteredDataType(
            IOperation predicate,
            Dictionary<ISymbol, Value> values,
            ImmutableHashSet<string> present
        ) =>
            WithoutConversions(predicate)
                is IDelegateCreationOperation
                {
                    Target: IAnonymousFunctionOperation
                    {
                        Symbol.Parameters: [var parameter],
                        Body.Operations: [
                            IReturnOperation
                            {
                                ReturnedValue: IBinaryOperation
                                {
                                    OperatorKind: BinaryOperatorKind.Equals,
                                    LeftOperand: IPropertyReferenceOperation
                                    {
                                        Property.Name: "DataType",
                                        Instance: IParameterReferenceOperation element,
                                    },
                                    RightOperand: var id,
                                },
                            },
                        ],
                    },
                }
            && Equal(element.Parameter, parameter)
                ? ValueOf(id, values, present)?.DataType
                : null;

        private bool Holds(
            IOperation? operation,
            ValueKind kind,
            Dictionary<ISymbol, Value> values,
            ImmutableHashSet<string> present
        ) => ValueOf(operation, values, present)?.Kind == kind;

        /// <summary>
        /// Whether the operation is a field of the class or a parameter of its primary constructor: no other parameter
        /// of <c>End</c> or the helper holds a service.
        /// </summary>
        private static bool IsDependency(IOperation? operation) =>
            WithoutConversions(operation)
                is IFieldReferenceOperation { Instance: IInstanceReferenceOperation }
                    or IParameterReferenceOperation;

        private static IOperation? WithoutConversions(IOperation? operation)
        {
            while (operation is IConversionOperation { OperatorMethod: null } conversion)
            {
                operation = conversion.Operand;
            }

            return operation;
        }

        private static bool Equal(ISymbol? symbol, ISymbol? other) =>
            SymbolEqualityComparer.Default.Equals(symbol, other);
    }
}
