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
/// Deletes an <c>IProcessTaskStart</c> implementation whose only work is to unlock the elements of an earlier task's
/// data type when a later task starts, so that the later task's users can change them, and binds the data type to the
/// later task as well, with <c>taskIds</c> in applicationmetadata.json. v9 refuses the unlock while the workflow engine
/// starts the task, and itself unlocks the data of every data type bound to a task when that task starts.
/// </summary>
/// <remarks>
/// <para>
/// The match is a hook class the upgrade can delete (<see cref="RemovableHook"/>) that implements
/// <c>IProcessTaskStart</c>. The body of <c>Start</c> is
/// <c>switch (taskId) { case "T": await Helper(instance); break; }</c>, and the helper's body is a local holding
/// <c>instance.Data.Where(d =&gt; d.DataType == "X")</c> and a <c>foreach</c> over it, whose body is
/// <c>await _dataClient.UnlockDataElement(new InstanceIdentifier(instance), Guid.Parse(e.Id));</c> on an
/// <c>IDataClient</c> field of the class.
/// In applicationmetadata.json, X is one data type with a <c>taskId</c> other than T and no <c>taskIds</c>, and T is a
/// task of the process. A data type two such classes unlock is left alone. Anything else is left alone, without a
/// message.
/// </para>
/// <para>
/// Binding X to T as well is safe when T is a data task, because v9 unlocks the data of every data type bound to a task
/// when the task starts, which is what the hook did, and lets the task's users change them. It also locks them again
/// when T ends, validates them in T, and creates an element of X at T's start when X has <c>autoCreate</c> and the
/// instance has none. The <c>taskId</c> is replaced with <c>"taskIds": ["&lt;taskId&gt;", "T"]</c> in the text of the
/// file, which keeps the rest of it.
/// </para>
/// <para>
/// When T is any other task, such as a signing, payment or confirmation task, validating and locking X there can stop
/// T's users from finishing it, so only the developer can choose between binding X and deleting the ported handler. Such
/// a match is left alone with a to-do at <c>Start</c>, which the port keeps as the handler's method.
/// </para>
/// <para>
/// The PDF step reads the tasks a data type is bound to, so binding a form data type with
/// <c>enablePdfCreation: true</c> to T would also create a PDF of it when T ends. Such a match is left alone with a
/// warning, and the general port of the hook then reports the unlock.
/// </para>
/// <para>
/// Seen in <c>tra/egenerklaering</c>, on library version 8.11.3, in a survey of production apps from 2026-10-20 to
/// 2026-10-24: it unlocks its form, bound to Task_1, when signing task Task_3 starts, so that the auditor can change
/// it. That app gets the to-do.
/// </para>
/// </remarks>
internal sealed class UnlockForLaterTaskScenario : IKnownScenario
{
    private const string DataClientName = "Altinn.App.Core.Internal.Data.IDataClient";
    private const string InstanceIdentifierName = "Altinn.App.Core.Models.InstanceIdentifier";

    public MigrationResult Apply(CSharpSourceScanner scanner, string projectFolder)
    {
        var files = scanner.Files.ToArray();
        var registrations = HookRegistrations.Find(files, [HookFamily.TaskStarting]);
        var unlocks = HookImplementation
            .Find(HookFamily.TaskStarting, files)
            .Select(hook => RemovableHook.Of(hook, files, registrations))
            .OfType<RemovableHook>()
            .Select(UnlockHook.Of)
            .OfType<UnlockHook>()
            .GroupBy(static unlock => unlock.DataType, StringComparer.Ordinal)
            .Where(static group => group.Count() == 1)
            .Select(static group => group.Single())
            .ToList();
        if (unlocks.Count == 0 || ApplicationMetadataText.Read(projectFolder) is not { } metadata)
        {
            return new MigrationResult();
        }

        var process = ProcessHookPortContext.Read(projectFolder);
        var bindings = new List<(UnlockHook Unlock, Binding Binding)>();
        var reports = new List<(UnlockHook Unlock, UpgradeMessage Message)>();
        foreach (var unlock in unlocks.Where(unlock => process.BpmnTaskIds.Contains(unlock.Task)))
        {
            if (Binding.Of(metadata, unlock.DataType, unlock.Task) is not { } binding)
            {
                continue;
            }

            var taskType = process.BpmnTaskTypes.GetValueOrDefault(unlock.Task);
            if (taskType != "data")
            {
                reports.Add((unlock, Refused(unlock, binding, taskType)));
            }
            else if (binding.AddsPdf)
            {
                reports.Add((unlock, PdfWarning(unlock)));
            }
            else
            {
                bindings.Add((unlock, binding));
            }
        }

        if (bindings.Count > 0)
        {
            metadata.Write(bindings.SelectMany(b => b.Binding.Edits(metadata)));
            foreach (var (unlock, binding) in bindings)
            {
                reports.Add((unlock, Bound(unlock, binding)));
                reports.Add((unlock, Deleted(unlock)));
            }

            RemovableHook.Remove(scanner, [.. bindings.Select(static b => b.Unlock.Removable)]);
        }

        return new MigrationResult([
            .. reports
                .OrderBy(static report => report.Unlock.Path, StringComparer.Ordinal)
                .ThenBy(static report => report.Unlock.Line)
                .Select(static report => report.Message),
        ]);
    }

    private static UpgradeMessage Bound(UnlockHook unlock, Binding binding) =>
        new(
            $"Bound data type {unlock.DataType} to {unlock.Task} as well as {binding.TaskId} in "
                + $"{ApplicationMetadataText.RelativePath}: v9 unlocks the data of a type bound to a task when the task "
                + "starts, as the hook did.",
            UpgradeMessageStatus.Warning
        );

    private static UpgradeMessage Deleted(UnlockHook unlock) =>
        new(
            $"Deleted {unlock.Path}, whose only work was that unlock, and its registration in "
                + $"{unlock.Removable.RegistrationLocation}.",
            UpgradeMessageStatus.Ok
        );

    private static UpgradeMessage PdfWarning(UnlockHook unlock) =>
        new(
            $"{unlock.Path}:{unlock.Line}: unlocks data type {unlock.DataType} when {unlock.Task} starts, so that it can "
                + $"be changed there. Adding {unlock.Task} to its taskIds in {ApplicationMetadataText.RelativePath} "
                + "would do that in v9, but the upgrade did not: it has PDF creation on, so the PDF step would then "
                + "also create a PDF of it when that task ends, which v8 did not.",
            UpgradeMessageStatus.Warning
        );

    private static UpgradeMessage Refused(UnlockHook unlock, Binding binding, string? taskType)
    {
        var task = taskType is null ? $"task {unlock.Task}" : $"{taskType} task {unlock.Task}";
        var pdf = binding.AddsPdf ? " and creates a PDF of it when the task ends" : "";
        return new(
            $"{unlock.Path}:{unlock.StartLine}: in v8 this hook unlocked data type {unlock.DataType} when {task} "
                + "started, so that it could be changed there. v9 keeps a data type locked outside its taskIds: to keep "
                + $"it editable there, add {unlock.Task} to its taskIds in {ApplicationMetadataText.RelativePath}, which "
                + $"also validates, finalizes and locks it in that task{pdf}; otherwise delete the handler.",
            UpgradeMessageStatus.Todo
        );
    }

    /// <summary>A matched hook: the unlock statement, the data type it unlocks and the task it unlocks it for.</summary>
    private sealed record UnlockHook(RemovableHook Removable, StatementSyntax Unlock, string DataType, string Task)
    {
        public string Path => Removable.Path;

        public int Line => Removable.Hook.File.GetLine(Unlock);

        /// <summary>The line of <c>Start</c>, which the port keeps as the handler's method.</summary>
        public int StartLine => Removable.Hook.File.GetLine(Removable.Body.Parent ?? Removable.Body);

        public static UnlockHook? Of(RemovableHook removable)
        {
            var (hook, body, helper, model) = (removable.Hook, removable.Body, removable.Helper, removable.Model);
            if (
                hook.Method.Parameters is not [var taskId, var instance, ..]
                || helper is not { } called
                || Branch(body, model, taskId) is not var (task, statements)
            )
            {
                return null;
            }

            return HelperLoop(statements, called, model, instance, hook.Type) is var (dataType, unlock)
                ? new UnlockHook(removable, unlock, dataType, task)
                : null;
        }

        /// <summary>
        /// The task and the statements of the one branch of <c>Start</c>: <c>switch (taskId) { case "T": …; break; }</c>
        /// without the <c>break</c>.
        /// </summary>
        private static (string Task, IReadOnlyList<StatementSyntax> Statements)? Branch(
            BlockSyntax body,
            SemanticModel model,
            IParameterSymbol taskId
        ) =>
            body.Statements switch
            {
                [
                    SwitchStatementSyntax
                    {
                        Sections: [
                            { Labels: [CaseSwitchLabelSyntax label], Statements: [.., BreakStatementSyntax] } section,
                        ],
                    } switchStatement,
                ] when Refers(model, switchStatement.Expression, taskId) && Text(label.Value) is { } task => (
                    task,
                    [.. section.Statements.Take(section.Statements.Count - 1)]
                ),
                _ => null,
            };

        /// <summary>
        /// The loop in <paramref name="helper"/>, when the branch is <c>await Helper(instance);</c> and the helper takes
        /// the instance as its one parameter.
        /// </summary>
        private static (string DataType, StatementSyntax Unlock)? HelperLoop(
            IReadOnlyList<StatementSyntax> statements,
            (MethodDeclarationSyntax Declaration, BlockSyntax Body) helper,
            SemanticModel model,
            IParameterSymbol instance,
            INamedTypeSymbol type
        )
        {
            if (
                statements
                    is not [
                        ExpressionStatementSyntax
                        {
                            Expression: AwaitExpressionSyntax
                            {
                                Expression: InvocationExpressionSyntax { ArgumentList.Arguments: [var argument] } call
                            }
                        },
                    ]
                || !Refers(model, argument.Expression, instance)
                || model.GetDeclaredSymbol(helper.Declaration) is not { Parameters: [_] } method
                || !Equal(model.GetSymbolInfo(call).Symbol, method)
            )
            {
                return null;
            }

            return Loop([.. helper.Body.Statements], model, type);
        }

        /// <summary>
        /// The data type and the unlock of <c>var es = instance.Data.Where(d =&gt; d.DataType == "X");</c> and
        /// <c>foreach (var e in es) { await _dataClient.UnlockDataElement(new InstanceIdentifier(instance), Guid.Parse(e.Id)); }</c>.
        /// </summary>
        private static (string DataType, StatementSyntax Unlock)? Loop(
            IReadOnlyList<StatementSyntax> statements,
            SemanticModel model,
            INamedTypeSymbol type
        )
        {
            if (
                statements
                    is not [
                        LocalDeclarationStatementSyntax
                        {
                            Declaration.Variables: [{ Initializer.Value: var source } variable],
                        },
                        ForEachStatementSyntax { Expression: IdentifierNameSyntax name } loop,
                    ]
                || !Equal(model.GetSymbolInfo(name).Symbol, model.GetDeclaredSymbol(variable))
                || UnlockedDataType(model, source) is not { } dataType
                || (loop.Statement is BlockSyntax { Statements: [var inBlock] } ? inBlock : loop.Statement)
                    is not ExpressionStatementSyntax unlock
                || !IsUnlock(model, unlock, type)
            )
            {
                return null;
            }

            return (dataType, unlock);
        }

        /// <summary>The X of <c>instance.Data.Where(d =&gt; d.DataType == "X")</c>.</summary>
        private static string? UnlockedDataType(SemanticModel model, ExpressionSyntax source) =>
            model.GetOperation(source)
                is IInvocationOperation
                {
                    TargetMethod: { Name: "Where", ContainingType: var linq },
                    Arguments: [{ Value: var data }, { Value: var predicate }],
                }
            && linq.ToDisplayString() == "System.Linq.Enumerable"
            && WithoutConversions(data)
                is IPropertyReferenceOperation { Property.Name: "Data", Instance: IParameterReferenceOperation }
            && WithoutConversions(predicate)
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
                                        Instance: IParameterReferenceOperation dataElement,
                                    },
                                    RightOperand: ILiteralOperation
                                    {
                                        ConstantValue: { HasValue: true, Value: string id }
                                    },
                                },
                            },
                        ],
                    },
                }
            && Equal(dataElement.Parameter, parameter)
                ? id
                : null;

        /// <summary>
        /// Whether the statement is
        /// <c>await _dataClient.UnlockDataElement(new InstanceIdentifier(instance), Guid.Parse(e.Id));</c> on an
        /// <c>IDataClient</c> field of the class, passing nothing else.
        /// </summary>
        private static bool IsUnlock(SemanticModel model, ExpressionStatementSyntax statement, INamedTypeSymbol type) =>
            model.GetOperation(statement)
                is IExpressionStatementOperation { Operation: IAwaitOperation { Operation: IInvocationOperation call } }
            && call.TargetMethod.OriginalDefinition is { Name: "UnlockDataElement" } method
            && method.ContainingType.ToDisplayString() == DataClientName
            && CSharpSemanticQueries.IsAltinnAppSymbol(method)
            && WithoutConversions(call.Instance)
                is IFieldReferenceOperation { Instance: IInstanceReferenceOperation, Field: var field }
            && Equal(field.ContainingType, type)
            && call.Arguments.All(argument =>
                argument.Parameter?.Name switch
                {
                    "instanceIdentifier" => WithoutConversions(argument.Value)
                        is IObjectCreationOperation
                        {
                            Initializer: null,
                            Constructor.ContainingType: var identifier,
                            Arguments: [{ Value: IParameterReferenceOperation }],
                        }
                        && identifier.ToDisplayString() == InstanceIdentifierName,
                    "dataGuid" => WithoutConversions(argument.Value)
                        is IInvocationOperation
                        {
                            TargetMethod: { Name: "Parse", ContainingType: var guid },
                            Arguments: [
                                {
                                    Value: IPropertyReferenceOperation
                                    {
                                        Property.Name: "Id",
                                        Instance: ILocalReferenceOperation,
                                    },
                                },
                            ],
                        }
                        && guid.ToDisplayString() == "System.Guid",
                    _ => argument.ArgumentKind == ArgumentKind.DefaultValue,
                }
            );

        /// <summary>The value of a string literal.</summary>
        private static string? Text(ExpressionSyntax expression) =>
            expression is LiteralExpressionSyntax { RawKind: (int)SyntaxKind.StringLiteralExpression } literal
                ? literal.Token.ValueText
                : null;

        private static bool Refers(SemanticModel model, ExpressionSyntax expression, ISymbol symbol) =>
            expression is IdentifierNameSyntax && Equal(model.GetSymbolInfo(expression).Symbol, symbol);

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

    /// <summary>
    /// What binding the data type to the later task as well means in applicationmetadata.json: the data type's position
    /// in <c>dataTypes</c>, its <c>taskId</c> property as the file spells it and its value, the later task, and whether
    /// the PDF step would then create a PDF of the data type when that task ends.
    /// </summary>
    private sealed record Binding(int Index, string TaskIdName, string TaskId, string Task, bool AddsPdf)
    {
        /// <summary>
        /// The binding of the one data type with id <paramref name="dataTypeId"/> to <paramref name="task"/>, when it
        /// has one string <c>taskId</c> other than that task and no <c>taskIds</c>.
        /// </summary>
        public static Binding? Of(ApplicationMetadataText metadata, string dataTypeId, string task)
        {
            if (
                metadata.DataType(dataTypeId) is not var (match, index)
                || ApplicationMetadataText.Named(match, "taskIds").Any()
                || ApplicationMetadataText.Single(match, "taskId")
                    is not { Value: JsonValue taskIdValue, Key: var taskIdName }
                || !taskIdValue.TryGetValue(out string? taskId)
                || taskId is not { Length: > 0 }
                || taskId == task
                || ApplicationMetadataText.Named(match, "enablePdfCreation").Count() > 1
            )
            {
                return null;
            }

            return new Binding(index, taskIdName, taskId, task, HasPdfAtEachTask(match));
        }

        /// <summary>The edits that replace <c>"taskId": "A"</c> with <c>"taskIds": ["A", "T"]</c>.</summary>
        public IEnumerable<(int Start, int End, string Replacement)> Edits(ApplicationMetadataText metadata)
        {
            var (nameStart, nameEnd, valueStart, valueEnd) = metadata.Locate(Index, TaskIdName);
            return
            [
                (nameStart, nameEnd, "\"taskIds\""),
                (valueStart, valueStart, "["),
                (valueEnd, valueEnd, $", {JsonSerializer.Serialize(Task)}]"),
            ];
        }

        /// <summary>
        /// Whether the PDF step creates a PDF of the data type at the end of each task it is bound to: it is a form, with
        /// <c>appLogic.classRef</c>, and its <c>enablePdfCreation</c> is true.
        /// </summary>
        private static bool HasPdfAtEachTask(JsonObject dataType) =>
            ApplicationMetadataText.Single(dataType, "appLogic") is { Value: JsonObject appLogic }
            && ApplicationMetadataText.Single(appLogic, "classRef") is { Value: JsonValue classRef }
            && classRef.TryGetValue(out string? model)
            && !string.IsNullOrWhiteSpace(model)
            && ApplicationMetadataText.Named(dataType, "enablePdfCreation").SingleOrDefault() is var flag
            && flag.Value?.GetValueKind() == JsonValueKind.True;
    }
}
