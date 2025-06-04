using System.Text.Json;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Validates form data against expression validations
/// </summary>
public class ExpressionValidator : IValidator
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly ILogger<ExpressionValidator> _logger;
    private readonly IAppResources _appResourceService;
    private readonly ILayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;
    private readonly IAppMetadata _appMetadata;

    /// <summary>
    /// Constructor for the expression validator
    /// </summary>
    public ExpressionValidator(
        ILogger<ExpressionValidator> logger,
        IAppResources appResourceService,
        ILayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IAppMetadata appMetadata
    )
    {
        _logger = logger;
        _appResourceService = appResourceService;
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
        _appMetadata = appMetadata;
    }

    /// <summary>
    /// We implement <see cref="ShouldRunForTask"/> instead
    /// </summary>
    public string TaskId => "*";

    /// <summary>
    /// Only run for tasks that specifies a layout set
    /// </summary>
    public bool ShouldRunForTask(string taskId) =>
        _appMetadata
            .GetApplicationMetadata()
            .Result.DataTypes.Exists(dt =>
                dt.TaskId == taskId
                && dt.AppLogic?.ClassRef is not null
                && _appResourceService.GetValidationConfiguration(dt.Id) is not null
            );

    /// <summary>
    /// This validator has the code "Expression" and this is known by the frontend, who may request this validator to not run for incremental validation.
    /// </summary>
    public string ValidationSource => ValidationIssueSources.Expression;

    /// <summary>
    /// We don't have an efficient way to figure out if changes to the model results in different validations, and frontend ignores this anyway
    /// </summary>
    public Task<bool> HasRelevantChanges(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes
    ) => Task.FromResult(true);

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    )
    {
        var validationIssues = new List<ValidationIssue>();
        foreach (var (dataType, dataElement) in dataAccessor.GetDataElementsForTask(taskId))
        {
            var validationConfig = _appResourceService.GetValidationConfiguration(dataType.Id);
            if (!string.IsNullOrEmpty(validationConfig))
            {
                var issues = await ValidateFormData(dataElement, dataAccessor, validationConfig, taskId, language);
                validationIssues.AddRange(issues);
            }
        }

        return validationIssues;
    }

    // Method signature kept to be compatible with existing tests
    internal async Task<List<ValidationIssue>> ValidateFormData(
        DataElement dataElement,
        IInstanceDataAccessor dataAccessor,
        string rawValidationConfig,
        string taskId,
        string? language
    )
    {
        var evaluatorState = await _layoutEvaluatorStateInitializer.Init(
            dataAccessor,
            taskId,
            gatewayAction: null,
            language
        );
        var hiddenFields = await LayoutEvaluator.GetHiddenFieldsForRemoval(evaluatorState);

        var validationIssues = new List<ValidationIssue>();
        DataElementIdentifier dataElementIdentifier = dataElement;
        var expressionValidations = ParseExpressionValidationConfig(rawValidationConfig, _logger);

        foreach (var (baseField, validations) in expressionValidations)
        {
            var resolvedFields = await evaluatorState.GetResolvedKeys(
                new DataReference() { Field = baseField, DataElementIdentifier = dataElementIdentifier }
            );
            foreach (var resolvedField in resolvedFields)
            {
                if (
                    hiddenFields.Exists(d =>
                        d.DataElementIdentifier == dataElementIdentifier
                        && resolvedField.Field.StartsWith(d.Field, StringComparison.InvariantCulture)
                    )
                )
                {
                    continue;
                }
                var context = new ComponentContext(
                    component: null,
                    rowIndices: DataModel.GetRowIndices(resolvedField.Field),
                    dataElementIdentifier: resolvedField.DataElementIdentifier
                );
                var positionalArguments = new object[] { resolvedField.Field };
                foreach (var validation in validations)
                {
                    await RunValidation(
                        evaluatorState,
                        validationIssues,
                        resolvedField,
                        context,
                        positionalArguments,
                        validation
                    );
                }
            }
        }

        return validationIssues;
    }

    private async Task RunValidation(
        LayoutEvaluatorState evaluatorState,
        List<ValidationIssue> validationIssues,
        DataReference resolvedField,
        ComponentContext context,
        object[] positionalArguments,
        ExpressionValidation validation
    )
    {
        try
        {
            var validationResult = await ExpressionEvaluator.EvaluateExpression(
                evaluatorState,
                validation.Condition,
                context,
                positionalArguments
            );
            switch (validationResult)
            {
                case true:
                    var message = await ExpressionEvaluator.EvaluateExpression(
                        evaluatorState,
                        validation.Message,
                        context,
                        positionalArguments
                    );

                    var validationIssue = new ValidationIssue
                    {
                        Field = resolvedField.Field,
                        DataElementId = resolvedField.DataElementIdentifier.Id,
                        Severity = validation.Severity ?? ValidationIssueSeverity.Error,
                        CustomTextKey = message as string ?? "",
                        Code = message as string ?? "",
                    };
                    validationIssues.Add(validationIssue);

                    break;
                case false:
                    break;
                default:
                    throw new ArgumentException(
                        $"Validation condition for {resolvedField} did not evaluate to a boolean"
                    );
            }
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error while evaluating expression validation for {resolvedField}", resolvedField);
            throw;
        }
    }

    private static RawExpressionValidation? ResolveValidationDefinition(
        JsonProperty definitionProperty,
        Dictionary<string, RawExpressionValidation> resolvedDefinitions,
        ILogger logger
    )
    {
        var resolvedDefinition = new RawExpressionValidation();

        var rawDefinition = definitionProperty.Value.Deserialize<RawExpressionValidation>(_jsonSerializerOptions);
        if (rawDefinition == null)
        {
            logger.LogError("Validation definition {name} could not be parsed", definitionProperty.Name);
            return null;
        }
        if (rawDefinition.Ref != null)
        {
            var reference = resolvedDefinitions.GetValueOrDefault(rawDefinition.Ref);
            if (reference == null)
            {
                logger.LogError(
                    "Could not resolve reference {rawDefinitionRef} for validation {name}",
                    rawDefinition.Ref,
                    definitionProperty.Name
                );
                return null;
            }
            resolvedDefinition.Message = reference.Message;
            resolvedDefinition.Condition = reference.Condition;
            resolvedDefinition.Severity = reference.Severity;
        }

        if (rawDefinition.Message != null)
        {
            resolvedDefinition.Message = rawDefinition.Message;
        }

        if (rawDefinition.Condition != null)
        {
            resolvedDefinition.Condition = rawDefinition.Condition;
        }

        if (rawDefinition.Severity != null)
        {
            resolvedDefinition.Severity = rawDefinition.Severity;
        }

        if (resolvedDefinition.Message == null)
        {
            logger.LogError("Validation {name} is missing message", definitionProperty.Name);
            return null;
        }

        if (resolvedDefinition.Condition == null)
        {
            logger.LogError("Validation {name} is missing condition", definitionProperty.Name);
            return null;
        }

        return resolvedDefinition;
    }

    private static ExpressionValidation? ResolveExpressionValidation(
        string field,
        JsonElement definition,
        Dictionary<string, RawExpressionValidation> resolvedDefinitions,
        ILogger logger
    )
    {
        var rawExpressionValidation = new RawExpressionValidation();

        if (definition.ValueKind == JsonValueKind.String)
        {
            var stringReference = definition.GetString();
            if (stringReference == null)
            {
                logger.LogError("Could not resolve null reference for validation for field {field}", field);
                return null;
            }
            var reference = resolvedDefinitions.GetValueOrDefault(stringReference);
            if (reference == null)
            {
                logger.LogError(
                    "Could not resolve reference {stringReference} for validation for field {field}",
                    stringReference,
                    field
                );
                return null;
            }
            rawExpressionValidation.Message = reference.Message;
            rawExpressionValidation.Condition = reference.Condition;
            rawExpressionValidation.Severity = reference.Severity;
        }
        else
        {
            var expressionDefinition = definition.Deserialize<RawExpressionValidation>(_jsonSerializerOptions);
            if (expressionDefinition == null)
            {
                logger.LogError("Validation for field {field} could not be parsed", field);
                return null;
            }

            if (expressionDefinition.Ref != null)
            {
                var reference = resolvedDefinitions.GetValueOrDefault(expressionDefinition.Ref);
                if (reference == null)
                {
                    logger.LogError(
                        "Could not resolve reference {expressionDefinitionRef} for validation for field {field}",
                        expressionDefinition.Ref,
                        field
                    );
                    return null;
                }
                rawExpressionValidation.Message = reference.Message;
                rawExpressionValidation.Condition = reference.Condition;
                rawExpressionValidation.Severity = reference.Severity;
            }

            if (expressionDefinition.Message != null)
            {
                rawExpressionValidation.Message = expressionDefinition.Message;
            }

            if (expressionDefinition.Condition != null)
            {
                rawExpressionValidation.Condition = expressionDefinition.Condition;
            }

            if (expressionDefinition.Severity != null)
            {
                rawExpressionValidation.Severity = expressionDefinition.Severity;
            }
        }

        if (rawExpressionValidation.Message == null)
        {
            logger.LogError("Validation for field {field} is missing message", field);
            return null;
        }

        if (rawExpressionValidation.Condition == null)
        {
            logger.LogError("Validation for field {field} is missing condition", field);
            return null;
        }

        var expressionValidation = new ExpressionValidation
        {
            Message = rawExpressionValidation.Message.Value,
            Condition = rawExpressionValidation.Condition.Value,
            Severity = rawExpressionValidation.Severity ?? ValidationIssueSeverity.Error,
        };

        return expressionValidation;
    }

    private static Dictionary<string, List<ExpressionValidation>> ParseExpressionValidationConfig(
        string validationConfig,
        ILogger logger
    )
    {
        using var expressionValidationConfigDocument = JsonDocument.Parse(validationConfig);
        var expressionValidationDefinitions = new Dictionary<string, RawExpressionValidation>();
        var hasDefinitions = expressionValidationConfigDocument.RootElement.TryGetProperty(
            "definitions",
            out JsonElement definitionsObject
        );
        if (hasDefinitions)
        {
            foreach (var definitionProperty in definitionsObject.EnumerateObject())
            {
                var resolvedDefinition = ResolveValidationDefinition(
                    definitionProperty,
                    expressionValidationDefinitions,
                    logger
                );
                if (resolvedDefinition == null)
                {
                    logger.LogError("Validation definition {name} could not be resolved", definitionProperty.Name);
                    continue;
                }
                expressionValidationDefinitions[definitionProperty.Name] = resolvedDefinition;
            }
        }

        var expressionValidations = new Dictionary<string, List<ExpressionValidation>>();
        var hasValidations = expressionValidationConfigDocument.RootElement.TryGetProperty(
            "validations",
            out JsonElement validationsObject
        );
        if (hasValidations)
        {
            foreach (var validationArray in validationsObject.EnumerateObject())
            {
                var field = validationArray.Name;
                var validations = validationArray.Value;
                foreach (var validation in validations.EnumerateArray())
                {
                    if (!expressionValidations.TryGetValue(field, out var expressionValidation))
                    {
                        expressionValidation = new List<ExpressionValidation>();
                        expressionValidations[field] = expressionValidation;
                    }
                    var resolvedExpressionValidation = ResolveExpressionValidation(
                        field,
                        validation,
                        expressionValidationDefinitions,
                        logger
                    );
                    if (resolvedExpressionValidation == null)
                    {
                        logger.LogError("Validation for field {field} could not be resolved", field);
                        continue;
                    }
                    expressionValidation.Add(resolvedExpressionValidation);
                }
            }
        }
        return expressionValidations;
    }
}
