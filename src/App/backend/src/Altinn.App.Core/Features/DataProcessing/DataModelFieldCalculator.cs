using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using ComponentContext = Altinn.App.Core.Models.Expressions.ComponentContext;

namespace Altinn.App.Core.Features.DataProcessing;

internal sealed class DataModelFieldCalculator
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

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

            var calculationConfig = _appResourceService.GetCalculationConfiguration(dataType.Id);
            if (!string.IsNullOrEmpty(calculationConfig))
            {
                await CalculateFormData(dataAccessor, dataElement, calculationConfig);
            }
        }
    }

    internal async Task CalculateFormData(
        IInstanceDataAccessor dataAccessor,
        DataElement dataElement,
        string rawCalculationConfig
    )
    {
        DataElementIdentifier dataElementIdentifier = dataElement;
        var dataModelFieldCalculations = ParseDataModelFieldCalculationConfig(rawCalculationConfig);
        var formDataWrapper = await dataAccessor.GetFormDataWrapper(dataElement);

        foreach (var (baseField, calculation) in dataModelFieldCalculations)
        {
            var resolvedFields = formDataWrapper.GetResolvedKeys(baseField);
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
                    calculation
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
        DataModelFieldCalculation calculation
    )
    {
        try
        {
            var calculationResult = await ExpressionEvaluator.EvaluateExpressionToExpressionValue(
                dataAccessor,
                calculation.Expression,
                context,
                positionalArguments
            );
            if (!formDataWrapper.Set(resolvedField.Field, calculationResult))
            {
                _logger.LogWarning(
                    "Could not set calculated value for field {Field} in data element {DataElementId}. "
                        + "This is because the type conversion failed.",
                    resolvedField.Field,
                    resolvedField.DataElementIdentifier.Id
                );
            }
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error while evaluating calculation for field {Field}", resolvedField.Field);
            throw;
        }
    }

    private Dictionary<string, DataModelFieldCalculation> ParseDataModelFieldCalculationConfig(
        string rawCalculationConfig
    )
    {
        JsonDocument calculationConfigDocument;
        try
        {
            calculationConfigDocument = JsonDocument.Parse(
                rawCalculationConfig,
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip }
            );
        }
        catch (JsonException e)
        {
            _logger.LogError(e, "Failed to parse calculation configuration JSON");
            return new Dictionary<string, DataModelFieldCalculation>();
        }
        using (calculationConfigDocument)
        {
            var dataModelFieldCalculations = new Dictionary<string, DataModelFieldCalculation>();
            var hasCalculations = calculationConfigDocument.RootElement.TryGetProperty(
                "calculations",
                out JsonElement calculationsObject
            );
            if (hasCalculations)
            {
                foreach (var calculationArray in calculationsObject.EnumerateObject())
                {
                    var field = calculationArray.Name;
                    var calculation = calculationArray.Value;
                    var resolvedDataModelFieldCalculation = ResolveDataModelFieldCalculation(field, calculation);
                    if (resolvedDataModelFieldCalculation == null)
                    {
                        _logger.LogError("Calculation for field {Field} could not be resolved", field);
                        continue;
                    }
                    dataModelFieldCalculations[field] = resolvedDataModelFieldCalculation;
                }
            }
            return dataModelFieldCalculations;
        }
    }

    private DataModelFieldCalculation? ResolveDataModelFieldCalculation(string field, JsonElement definition)
    {
        var dataModelFieldCalculationDefinition = definition.Deserialize<RawDataModelFieldCalculation>(
            _jsonSerializerOptions
        );
        if (dataModelFieldCalculationDefinition == null)
        {
            _logger.LogError("Calculation for field {Field} could not be parsed", field);
            return null;
        }

        if (dataModelFieldCalculationDefinition.Expression == null)
        {
            _logger.LogError("Calculation for field {Field} is missing expression", field);
            return null;
        }

        var dataModelFieldCalculation = new DataModelFieldCalculation
        {
            Expression = dataModelFieldCalculationDefinition.Expression.Value,
        };

        return dataModelFieldCalculation;
    }
}
