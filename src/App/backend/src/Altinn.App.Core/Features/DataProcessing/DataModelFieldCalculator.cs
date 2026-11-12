using System.Text.Json;
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
    /// The row id is owned by the data model, so a result never writes it. Rows keep their id by position.
    /// </summary>
    private const string AltinnRowIdJsonName = "altinnRowId";

    private static readonly ExpressionValue _emptyObject = ExpressionValue.FromJsonString("{}");

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

    public async Task Calculate(IInstanceDataAccessor dataAccessor, string taskId)
    {
        using var activity = _telemetry?.StartCalculateActivity(dataAccessor.Instance.Id, taskId);
        foreach (var (dataType, dataElement) in dataAccessor.GetDataElementsWithFormDataForTask(taskId))
        {
            if (await _dataElementAccessChecker.CanRead(dataAccessor.Instance, dataType) is false)
            {
                continue;
            }

            var calculationConfig = _appResourceService.GetCalculationConfig(dataType.Id);
            if (calculationConfig is not null)
            {
                await CalculateFormData(dataAccessor, dataElement, calculationConfig);
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
        try
        {
            var calculationResult = await ExpressionEvaluator.EvaluateExpressionToExpressionValue(
                dataAccessor,
                calculation,
                context,
                positionalArguments
            );
            if (calculationResult.ValueKind is JsonValueKind.Object or JsonValueKind.Array)
            {
                SetResult(formDataWrapper, resolvedField, resolvedField.Field, calculationResult.JsonElement);
            }
            else
            {
                SetLeaf(formDataWrapper, resolvedField, resolvedField.Field, calculationResult);
            }
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error while evaluating calculation for field {Field}", resolvedField.Field);
            throw;
        }
    }

    /// <summary>
    /// Writes a result the same way the frontend does: an object sets the properties it contains and leaves the
    /// others alone, and a list of objects is merged row by row, so existing rows keep their row id and the
    /// properties the result leaves out. Other values replace the field.
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
            if (property.Name == AltinnRowIdJsonName)
            {
                continue;
            }

            SetResult(formDataWrapper, field, $"{path}.{property.Name}", property.Value);
        }
    }

    private void MergeRows(IFormDataWrapper formDataWrapper, DataReference field, string path, JsonElement rows)
    {
        var currentRowCount = formDataWrapper.GetRowCount(path, rowIndexes: default) ?? 0;
        var rowCount = 0;
        foreach (var row in rows.EnumerateArray())
        {
            var rowPath = $"{path}[{rowCount}]";
            rowCount++;
            // A new row is added as an empty object, and a null row replaced by one, before the properties are set.
            // Row ids are initialized when the changes are collected, after all data processing.
            var rowExists =
                rowCount > currentRowCount
                    ? formDataWrapper.AddRow(path, _emptyObject)
                    : formDataWrapper.Get(rowPath) is not null || formDataWrapper.Set(rowPath, _emptyObject);
            if (!rowExists)
            {
                LogSetFailed(field, rowPath);
                continue;
            }

            MergeObject(formDataWrapper, field, rowPath, row);
        }

        for (var index = currentRowCount - 1; index >= rowCount; index--)
        {
            formDataWrapper.RemoveField($"{path}[{index}]", RowRemovalOption.DeleteRow);
        }
    }

    private void SetLeaf(IFormDataWrapper formDataWrapper, DataReference field, string path, ExpressionValue value)
    {
        if (!formDataWrapper.Set(path, value))
        {
            LogSetFailed(field, path);
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

    private static bool IsListOfObjects(JsonElement list)
    {
        if (list.GetArrayLength() == 0)
        {
            return false;
        }

        foreach (var item in list.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object)
            {
                return false;
            }
        }

        return true;
    }
}
