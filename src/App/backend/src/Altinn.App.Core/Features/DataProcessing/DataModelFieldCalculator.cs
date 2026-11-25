using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Calculation;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using ComponentContext = Altinn.App.Core.Models.Expressions.ComponentContext;

namespace Altinn.App.Core.Features.DataProcessing;

internal sealed class DataModelFieldCalculator
{
    /// <summary>
    /// A row in a result may carry its own row id, such as a row copied from another group, and is then matched to
    /// the row with that id. Rows without one are matched by position.
    /// </summary>
    private const string AltinnRowIdJsonName = "altinnRowId";

    /// <summary>
    /// The source of a result row that does not merge into a current row
    /// </summary>
    private const int NewRow = -1;

    private readonly ILogger<DataModelFieldCalculator> _logger;
    private readonly IAppResources _appResourceService;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;
    private readonly Telemetry? _telemetry;

    public DataModelFieldCalculator(
        ILogger<DataModelFieldCalculator> logger,
        IAppResources appResourceService,
        IDataElementAccessChecker dataElementAccessChecker,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _appResourceService = appResourceService;
        _dataElementAccessChecker = dataElementAccessChecker;
        _telemetry = telemetry;
    }

    /// <summary>
    /// Runs the calculations of every form data element in the task, including the elements that
    /// <paramref name="changes"/> creates, so a new instance stores the same values the frontend calculates when it
    /// loads the form.
    /// </summary>
    public async Task Calculate(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges? changes = null)
    {
        foreach (var (dataType, dataElement) in GetFormDataElementsForTask(dataAccessor, taskId, changes))
        {
            if (await _dataElementAccessChecker.CanRead(dataAccessor.Instance, dataType) is false)
            {
                continue;
            }

            var calculationConfig = _appResourceService.GetCalculationConfig(dataType.Id);
            if (calculationConfig is not null)
            {
                using var activity = _telemetry?.StartCalculateActivity(
                    dataAccessor.Instance.Id,
                    taskId,
                    dataType,
                    dataElement
                );
                await CalculateFormData(dataAccessor, dataElement, calculationConfig);
            }
        }
    }

    private static IEnumerable<(DataType dataType, DataElement dataElement)> GetFormDataElementsForTask(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges? changes
    )
    {
        var seen = new HashSet<DataElementIdentifier>();
        foreach (var (dataType, dataElement) in dataAccessor.GetDataElementsWithFormDataForTask(taskId))
        {
            if (seen.Add(dataElement))
            {
                yield return (dataType, dataElement);
            }
        }

        if (changes is null)
        {
            yield break;
        }

        // Elements being created are not on the instance yet
        foreach (var change in changes.FormDataChanges)
        {
            if (
                change.Type == ChangeType.Created
                && change.DataElement is { } dataElement
                && change.DataType.IsBoundToTask(taskId)
                && seen.Add(dataElement)
            )
            {
                yield return (change.DataType, dataElement);
            }
        }
    }

    private async Task CalculateFormData(
        IInstanceDataAccessor dataAccessor,
        DataElement dataElement,
        CalculationConfig calculationConfig
    )
    {
        DataElementIdentifier dataElementIdentifier = dataElement;
        var formDataWrapper = await dataAccessor.GetFormDataWrapper(dataElement);

        foreach (var calculation in calculationConfig.Calculations)
        {
            var resolvedFields = formDataWrapper.GetResolvedKeys(calculation.Field);
            foreach (var resolvedField in resolvedFields)
            {
                var resolvedFieldReference = new DataReference()
                {
                    Field = resolvedField,
                    DataElementIdentifier = dataElementIdentifier,
                };
                var context = new ComponentContext(
                    dataAccessor,
                    component: null,
                    rowIndices: ExpressionHelper.GetRowIndices(resolvedField),
                    dataElementIdentifier: dataElementIdentifier
                );
                var positionalArguments = new ExpressionValue[] { resolvedField };

                await RunCalculation(
                    dataAccessor,
                    context,
                    formDataWrapper,
                    resolvedFieldReference,
                    positionalArguments,
                    calculation.Expression
                );
            }
        }
    }

    private async Task RunCalculation(
        IInstanceDataAccessor dataAccessor,
        ComponentContext context,
        IFormDataWrapper formDataWrapper,
        DataReference resolvedField,
        ExpressionValue[] positionalArguments,
        Expression calculation
    )
    {
        ExpressionValue calculationResult;
        try
        {
            calculationResult = await ExpressionEvaluator.EvaluateExpressionToExpressionValue(
                dataAccessor,
                calculation,
                context,
                positionalArguments
            );
        }
        catch (Exception e)
        {
            // Data in the data model can make an expression fail, as when a text that is not a number is added.
            // The field keeps its value and the other calculations run, as on the frontend.
            _logger.LogError(e, "Error while evaluating calculation for field {Field}", resolvedField.Field);
            return;
        }

        if (calculationResult.ValueKind is JsonValueKind.Object or JsonValueKind.Array)
        {
            SetResult(formDataWrapper, resolvedField, resolvedField.Field, calculationResult.JsonElement);
        }
        else
        {
            SetLeaf(formDataWrapper, resolvedField, resolvedField.Field, calculationResult);
        }
    }

    /// <summary>
    /// Writes a result the same way the frontend does: an object sets the properties it contains and leaves the
    /// others alone, and a list of objects is merged row by row, so existing rows keep the properties the result
    /// leaves out, and their row id unless the result row has one. Other values replace the field.
    /// </summary>
    private void SetResult(IFormDataWrapper formDataWrapper, DataReference field, string path, JsonElement result)
    {
        switch (result.ValueKind)
        {
            case JsonValueKind.Object:
                MergeObject(formDataWrapper, field, path, result);
                break;
            case JsonValueKind.Array when IsListOfObjects(result):
                MergeRows(formDataWrapper, field, path, result);
                break;
            default:
                SetLeaf(formDataWrapper, field, path, result);
                break;
        }
    }

    private void MergeObject(IFormDataWrapper formDataWrapper, DataReference field, string path, JsonElement result)
    {
        foreach (var property in result.EnumerateObject())
        {
            // A row copied from another list brings its own id and keeps it. Anything but a GUID keeps the existing
            // id, as does the empty GUID, which would otherwise give the row a new id when ids are initialized.
            if (property.Name == AltinnRowIdJsonName && GetRowId(property.Value) is null)
            {
                LogSetFailed(field, $"{path}.{property.Name}");
                continue;
            }

            SetResult(formDataWrapper, field, $"{path}.{property.Name}", property.Value);
        }
    }

    /// <summary>
    /// Merges a list of objects into the rows of a list, the same way the frontend does. When every result row has an
    /// id, each merges into the row with that id, wherever it is, or becomes a new row with that id. When none has,
    /// each merges into the row at its position. A result where only some rows have an id is logged and leaves the
    /// list as it is, since it is not clear which rule was meant. The rows end up in the order of the result, and
    /// rows it does not name are removed.
    /// </summary>
    private void MergeRows(IFormDataWrapper formDataWrapper, DataReference field, string path, JsonElement rows)
    {
        // Check the result before anything is written. Bad data can give a result like this, so it is logged and the
        // list is left as it is, as when an expression fails to evaluate.
        var resultRows = rows.EnumerateArray().ToList();
        var resultRowIds = new Guid?[resultRows.Count];
        var seenRowIds = new HashSet<Guid>();
        for (var index = 0; index < resultRows.Count; index++)
        {
            if (resultRows[index].ValueKind != JsonValueKind.Object)
            {
                // The frontend cannot show a row that is not an object, so the list is left as it is
                _logger.LogError(
                    "The calculation for {Field} gives a list where row {Index} in {Path} is {ValueKind}, not an object",
                    field.Field,
                    index,
                    path,
                    resultRows[index].ValueKind
                );
                return;
            }

            resultRowIds[index] = resultRows[index].TryGetProperty(AltinnRowIdJsonName, out var rowId)
                ? GetRowId(rowId)
                : null;
            if (resultRowIds[index] is { } id && !seenRowIds.Add(id))
            {
                // Rows are matched by id, so a list that cannot be told apart is left as it is
                _logger.LogError(
                    "The calculation for {Field} gives more than one row in {Path} the altinnRowId {RowId}",
                    field.Field,
                    path,
                    id
                );
                return;
            }
        }

        if (seenRowIds.Count > 0 && seenRowIds.Count < resultRows.Count)
        {
            _logger.LogError(
                "The calculation for {Field} gives a list where some rows in {Path} have an altinnRowId and some do not. "
                    + "Rows are merged by id when all of them have one, and by position when none has.",
                field.Field,
                path
            );
            return;
        }

        var currentRowCount = formDataWrapper.GetRowCount(path, rowIndexes: default) ?? 0;
        var currentRows = new object?[currentRowCount];
        var currentIndexById = new Dictionary<Guid, int>();
        for (var index = 0; index < currentRowCount; index++)
        {
            currentRows[index] = formDataWrapper.Get($"{path}[{index}]");
            if (currentRows[index] is { } row && IsScalar(row))
            {
                // The rows of the list are not objects, so the list cannot hold the result
                LogRowsNotWritten(field, path);
                return;
            }

            if (currentRows[index] is not null && GetCurrentRowId(formDataWrapper, $"{path}[{index}]") is { } id)
            {
                currentIndexById.TryAdd(id, index);
            }
        }

        var sources = PlanRows(resultRowIds, currentRows, currentIndexById);
        var rowsStayInPlace = true;
        for (var index = 0; index < sources.Length; index++)
        {
            rowsStayInPlace &=
                sources[index] == index
                || (sources[index] == NewRow && (index >= currentRowCount || currentRows[index] is null));
        }

        if (rowsStayInPlace)
        {
            // The common case, such as a result computed from the same list: rows are only added or removed at the
            // end, or a null row is replaced, so the rows that stay are not touched
            for (var index = 0; index < sources.Length; index++)
            {
                if (sources[index] != NewRow)
                {
                    continue;
                }

                var newRow = NewRowWithId(resultRowIds[index] ?? Guid.NewGuid());
                var added =
                    index >= currentRowCount
                        ? formDataWrapper.AddRow(path, newRow)
                        : formDataWrapper.Set($"{path}[{index}]", newRow);
                if (!added)
                {
                    // The list cannot be added to. Stop before the rows beyond the result are removed, so a list
                    // that cannot hold the result is left as it is.
                    LogRowsNotWritten(field, path);
                    return;
                }
            }

            for (var index = currentRowCount - 1; index >= sources.Length; index--)
            {
                formDataWrapper.RemoveField($"{path}[{index}]", RowRemovalOption.DeleteRow);
            }
        }
        else
        {
            // Rows move, so the list is written again from its own data in the new order, with new rows added.
            // Properties the model does not serialize, such as those with [JsonIgnore], are lost on the moved rows.
            var currentList = ExpressionValue.FromObject(formDataWrapper.Get(path)).JsonElement;
            var arranged = new JsonArray();
            for (var index = 0; index < sources.Length; index++)
            {
                arranged.Add(
                    sources[index] == NewRow
                        ? NewRowWithId(resultRowIds[index] ?? Guid.NewGuid())
                        : JsonNode.Parse(currentList[sources[index]].GetRawText())
                );
            }

            if (!formDataWrapper.Set(path, arranged))
            {
                LogRowsNotWritten(field, path);
                return;
            }
        }

        for (var index = 0; index < resultRows.Count; index++)
        {
            MergeObject(formDataWrapper, field, $"{path}[{index}]", resultRows[index]);
        }
    }

    /// <summary>
    /// Finds the current row each result row merges into, or <see cref="NewRow"/>: by id when the rows have one, and
    /// by position when they do not
    /// </summary>
    private static int[] PlanRows(Guid?[] resultRowIds, object?[] currentRows, Dictionary<Guid, int> currentIndexById)
    {
        var sources = new int[resultRowIds.Length];
        for (var index = 0; index < resultRowIds.Length; index++)
        {
            sources[index] = resultRowIds[index] switch
            {
                { } id => currentIndexById.GetValueOrDefault(id, NewRow),
                null when index < currentRows.Length && currentRows[index] is not null => index,
                null => NewRow,
            };
        }

        return sources;
    }

    private static JsonObject NewRowWithId(Guid rowId) => new() { [AltinnRowIdJsonName] = rowId.ToString() };

    /// <summary>
    /// A row id in a result is a GUID other than the empty one, as the backend stores it
    /// </summary>
    private static Guid? GetRowId(JsonElement value) =>
        value.ValueKind == JsonValueKind.String
        && Guid.TryParseExact(value.GetString(), "D", out var rowId)
        && rowId != Guid.Empty
            ? rowId
            : null;

    private static Guid? GetCurrentRowId(IFormDataWrapper formDataWrapper, string rowPath) =>
        formDataWrapper.Get($"{rowPath}.{AltinnRowIdJsonName}") switch
        {
            Guid rowId when rowId != Guid.Empty => rowId,
            string text when Guid.TryParse(text, out var rowId) && rowId != Guid.Empty => rowId,
            _ => null,
        };

    private void SetLeaf(IFormDataWrapper formDataWrapper, DataReference field, string path, ExpressionValue value)
    {
        if (!formDataWrapper.Set(path, value))
        {
            LogSetFailed(field, path);
            return;
        }

        if (value.ValueKind is JsonValueKind.Null && formDataWrapper.Get(path) is { } defaultValue)
        {
            // A non-nullable value type cannot hold null, so Set gives it the value it has in a new object. The
            // frontend keeps the value it has until it gets this one.
            _logger.LogWarning(
                "Could not calculate null into the non-nullable field {Field} in data element {DataElementId}. "
                    + "The field is set to its default value {DefaultValue}.",
                path,
                field.DataElementIdentifier.Id,
                defaultValue
            );
        }
    }

    private void LogSetFailed(DataReference field, string path)
    {
        _logger.LogWarning(
            "Could not set calculated value for field {Field} in data element {DataElementId}. "
                + "The field does not exist in the data model, or the value could not be converted to its type.",
            path,
            field.DataElementIdentifier.Id
        );
    }

    private void LogRowsNotWritten(DataReference field, string path)
    {
        _logger.LogWarning(
            "Could not set calculated value for field {Field} in data element {DataElementId}. "
                + "The result is a list of objects, and the rows of the field cannot be set to objects.",
            path,
            field.DataElementIdentifier.Id
        );
    }

    private static bool IsScalar(object value) => value is string || value.GetType().IsValueType;

    /// <summary>
    /// A list with an object in it is merged as rows, and every row must then be an object. A list of primitives,
    /// or an empty one, replaces the field instead.
    /// </summary>
    private static bool IsListOfObjects(JsonElement list)
    {
        foreach (var item in list.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.Object)
            {
                return true;
            }
        }

        return false;
    }
}
