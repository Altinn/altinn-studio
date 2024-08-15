using System.Text.Json;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Validates form data against expression validations
/// </summary>
public class ExpressionValidator : IFormDataValidator
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions =
        new() { ReadCommentHandling = JsonCommentHandling.Skip, PropertyNamingPolicy = JsonNamingPolicy.CamelCase, };

    private readonly ILogger<ExpressionValidator> _logger;
    private readonly IAppResources _appResourceService;
    private readonly ILayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;

    /// <summary>
    /// Constructor for the expression validator
    /// </summary>
    public ExpressionValidator(
        ILogger<ExpressionValidator> logger,
        IAppResources appResourceService,
        ILayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer
    )
    {
        _logger = logger;
        _appResourceService = appResourceService;
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
    }

    /// <inheritdoc />
    public string DataType => "*";

    /// <summary>
    /// This validator has the code "Expression" and this is known by the frontend, who may request this validator to not run for incremental validation.
    /// </summary>
    public string ValidationSource => "Expression";

    /// <summary>
    /// We don't have an efficient way to figure out if changes to the model results in different validations, and frontend ignores this anyway
    /// </summary>
    public bool HasRelevantChanges(object current, object previous) => true;

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        object data,
        string? language
    )
    {
        // TODO: Consider not depending on the instance object to get the task
        //       to follow the same principle as the other validators
        var taskId = instance.Process.CurrentTask.ElementId;
        var rawValidationConfig = _appResourceService.GetValidationConfiguration(dataElement.DataType);
        if (rawValidationConfig == null)
        {
            // No validation configuration exists for this data type
            return new List<ValidationIssue>();
        }

        using var validationConfig = JsonDocument.Parse(rawValidationConfig);

        var evaluatorState = await _layoutEvaluatorStateInitializer.Init(
            instance,
            taskId,
            gatewayAction: null,
            language
        );
        var hiddenFields = LayoutEvaluator.GetHiddenFieldsForRemoval(evaluatorState, true);

        var validationIssues = new List<ValidationIssue>();
        var expressionValidations = ParseExpressionValidationConfig(validationConfig.RootElement, _logger);
        foreach (var validationObject in expressionValidations)
        {
            var baseField = new ModelBinding { Field = validationObject.Key, DataType = dataElement.DataType };
            var resolvedFields = evaluatorState.GetResolvedKeys(baseField);
            var validations = validationObject.Value;
            foreach (var resolvedField in resolvedFields)
            {
                if (hiddenFields.Contains(resolvedField))
                {
                    continue;
                }
                var context = new ComponentContext(
                    component: null,
                    rowIndices: DataModel.GetRowIndices(resolvedField),
                    rowLength: null
                );
                var positionalArguments = new object[] { resolvedField };
                foreach (var validation in validations)
                {
                    try
                    {
                        if (validation.Condition == null)
                        {
                            continue;
                        }

                        var validationResult = ExpressionEvaluator.EvaluateExpression(
                            evaluatorState,
                            validation.Condition.Value,
                            context,
                            positionalArguments
                        );
                        switch (validationResult)
                        {
                            case true:
                                var validationIssue = new ValidationIssue
                                {
                                    Field = resolvedField.Field,
                                    DataElementId = resolvedField.DataType,
                                    Severity = validation.Severity ?? ValidationIssueSeverity.Error,
                                    CustomTextKey = validation.Message,
                                    Code = validation.Message,
                                    Source = ValidationIssueSources.Expression,
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
                        _logger.LogError(
                            e,
                            "Error while evaluating expression validation for {resolvedField}",
                            resolvedField
                        );
                        throw;
                    }
                }
            }
        }

        return validationIssues;
    }

    private static RawExpressionValidation? ResolveValidationDefinition(
        string name,
        JsonElement definition,
        Dictionary<string, RawExpressionValidation> resolvedDefinitions,
        ILogger logger
    )
    {
        var resolvedDefinition = new RawExpressionValidation();

        var rawDefinition = definition.Deserialize<RawExpressionValidation>(_jsonSerializerOptions);
        if (rawDefinition == null)
        {
            logger.LogError("Validation definition {name} could not be parsed", name);
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
                    name
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
            logger.LogError("Validation {name} is missing message", name);
            return null;
        }

        if (resolvedDefinition.Condition == null)
        {
            logger.LogError("Validation {name} is missing condition", name);
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
            Message = rawExpressionValidation.Message,
            Condition = rawExpressionValidation.Condition,
            Severity = rawExpressionValidation.Severity ?? ValidationIssueSeverity.Error,
        };

        return expressionValidation;
    }

    private static Dictionary<string, List<ExpressionValidation>> ParseExpressionValidationConfig(
        JsonElement expressionValidationConfig,
        ILogger logger
    )
    {
        var expressionValidationDefinitions = new Dictionary<string, RawExpressionValidation>();
        var hasDefinitions = expressionValidationConfig.TryGetProperty(
            "definitions",
            out JsonElement definitionsObject
        );
        if (hasDefinitions)
        {
            foreach (var definitionObject in definitionsObject.EnumerateObject())
            {
                var name = definitionObject.Name;
                var definition = definitionObject.Value;
                var resolvedDefinition = ResolveValidationDefinition(
                    name,
                    definition,
                    expressionValidationDefinitions,
                    logger
                );
                if (resolvedDefinition == null)
                {
                    logger.LogError("Validation definition {name} could not be resolved", name);
                    continue;
                }
                expressionValidationDefinitions[name] = resolvedDefinition;
            }
        }
        var expressionValidations = new Dictionary<string, List<ExpressionValidation>>();
        var hasValidations = expressionValidationConfig.TryGetProperty(
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
