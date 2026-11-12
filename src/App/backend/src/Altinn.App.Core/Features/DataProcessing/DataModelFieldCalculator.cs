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

            var calculationSchema = _appResourceService.GetCalculationSchema(dataType.Id);
            if (calculationSchema is not null)
            {
                await CalculateFormData(dataAccessor, dataElement, calculationSchema);
            }
        }
    }

    private async Task CalculateFormData(
        IInstanceDataAccessor dataAccessor,
        DataElement dataElement,
        CalculationSchema calculationSchema
    )
    {
        DataElementIdentifier dataElementIdentifier = dataElement;
        var formDataWrapper = await dataAccessor.GetFormDataWrapper(dataElement);

        foreach (var calculation in calculationSchema.Calculations)
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
}
