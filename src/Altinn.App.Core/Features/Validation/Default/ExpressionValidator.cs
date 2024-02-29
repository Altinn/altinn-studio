using System.Text.Json;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Validates form data against expression validations
/// </summary>
public class ExpressionValidator : IFormDataValidator
{
    private readonly ILogger<ExpressionValidator> _logger;
    private readonly IAppResources _appResourceService;
    private readonly LayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;
    private readonly IAppMetadata _appMetadata;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    /// <summary>
    /// Constructor for the expression validator
    /// </summary>
    public ExpressionValidator(ILogger<ExpressionValidator> logger, IAppResources appResourceService, LayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer, IAppMetadata appMetadata)
    {
        _logger = logger;
        _appResourceService = appResourceService;
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
        _appMetadata = appMetadata;
    }

    /// <inheritdoc />
    public string DataType => "*";

    /// <summary>
    /// This validator has the code "Expression" and this is known by the frontend, who may request this validator to not run for incremental validation.
    /// </summary>
    public string ValidationSource => "Expression";

    /// <summary>
    /// Expression validations should always run (it is way to complex to figure out if it should run or not)
    /// </summary>
    public bool HasRelevantChanges(object current, object previous) => true;

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> ValidateFormData(Instance instance, DataElement dataElement, object data, string? language)
    {
        var rawValidationConfig = _appResourceService.GetValidationConfiguration(dataElement.DataType);
        if (rawValidationConfig == null)
        {
            // No validation configuration exists for this data type
            return new List<ValidationIssue>();
        }

        using var validationConfig = JsonDocument.Parse(rawValidationConfig);
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var layoutSet = _appResourceService.GetLayoutSetForTask(appMetadata.DataTypes.First(dt => dt.Id == dataElement.DataType).TaskId);
        var evaluatorState = await _layoutEvaluatorStateInitializer.Init(instance, data, layoutSet?.Id);
        var hiddenFields = LayoutEvaluator.GetHiddenFieldsForRemoval(evaluatorState, true);

        var validationIssues = new List<ValidationIssue>();
        var expressionValidations = ParseExpressionValidationConfig(validationConfig.RootElement, _logger);
        foreach (var validationObject in expressionValidations)
        {
            var baseField = validationObject.Key;
            var resolvedFields = evaluatorState.GetResolvedKeys(baseField);
            var validations = validationObject.Value;
            foreach (var resolvedField in resolvedFields)
            {
                if (hiddenFields.Contains(resolvedField))
                {
                    continue;
                }
                var context = new ComponentContext(component: null, rowIndices: DataModel.GetRowIndices(resolvedField), rowLength: null);
                var positionalArguments = new[] { resolvedField };
                foreach (var validation in validations)
                {
                    try
                    {
                        if (validation.Condition == null)
                        {
                            continue;
                        }

                        var isInvalid = ExpressionEvaluator.EvaluateExpression(evaluatorState, validation.Condition, context, positionalArguments);
                        if (isInvalid is not bool)
                        {
                            throw new ArgumentException($"Validation condition for {resolvedField} did not evaluate to a boolean");
                        }
                        if ((bool)isInvalid)
                        {
                            var validationIssue = new ValidationIssue
                            {
                                Field = resolvedField,
                                Severity = validation.Severity ?? ValidationIssueSeverity.Error,
                                CustomTextKey = validation.Message,
                                Code = validation.Message,
                                Source = ValidationIssueSources.Expression,
                            };
                            validationIssues.Add(validationIssue);
                        }
                    }
                    catch (Exception e)
                    {
                        _logger.LogError(e, "Error while evaluating expression validation for {resolvedField}", resolvedField);
                        throw;
                    }
                }
            }
        }


        return validationIssues;
    }

    private static RawExpressionValidation? ResolveValidationDefinition(string name, JsonElement definition, Dictionary<string, RawExpressionValidation> resolvedDefinitions, ILogger logger)
    {
        var resolvedDefinition = new RawExpressionValidation();

        var rawDefinition = definition.Deserialize<RawExpressionValidation>(_jsonOptions);
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
                logger.LogError("Could not resolve reference {rawDefinitionRef} for validation {name}", rawDefinition.Ref, name);
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

    private static ExpressionValidation? ResolveExpressionValidation(string field, JsonElement definition, Dictionary<string, RawExpressionValidation> resolvedDefinitions, ILogger logger)
    {

        var rawExpressionValidatıon = new RawExpressionValidation();

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
                logger.LogError("Could not resolve reference {stringReference} for validation for field {field}", stringReference, field);
                return null;
            }
            rawExpressionValidatıon.Message = reference.Message;
            rawExpressionValidatıon.Condition = reference.Condition;
            rawExpressionValidatıon.Severity = reference.Severity;
        }
        else
        {
            var expressionDefinition = definition.Deserialize<RawExpressionValidation>(_jsonOptions);
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
                    logger.LogError("Could not resolve reference {expressionDefinitionRef} for validation for field {field}", expressionDefinition.Ref, field);
                    return null;

                }
                rawExpressionValidatıon.Message = reference.Message;
                rawExpressionValidatıon.Condition = reference.Condition;
                rawExpressionValidatıon.Severity = reference.Severity;
            }

            if (expressionDefinition.Message != null)
            {
                rawExpressionValidatıon.Message = expressionDefinition.Message;
            }

            if (expressionDefinition.Condition != null)
            {
                rawExpressionValidatıon.Condition = expressionDefinition.Condition;
            }

            if (expressionDefinition.Severity != null)
            {
                rawExpressionValidatıon.Severity = expressionDefinition.Severity;
            }
        }

        if (rawExpressionValidatıon.Message == null)
        {
            logger.LogError("Validation for field {field} is missing message", field);
            return null;
        }

        if (rawExpressionValidatıon.Condition == null)
        {
            logger.LogError("Validation for field {field} is missing condition", field);
            return null;
        }

        var expressionValidation = new ExpressionValidation
        {
            Message = rawExpressionValidatıon.Message,
            Condition = rawExpressionValidatıon.Condition,
            Severity = rawExpressionValidatıon.Severity ?? ValidationIssueSeverity.Error,
        };

        return expressionValidation;
    }

    private static Dictionary<string, List<ExpressionValidation>> ParseExpressionValidationConfig(JsonElement expressionValidationConfig, ILogger logger)
    {
        var expressionValidationDefinitions = new Dictionary<string, RawExpressionValidation>();
        JsonElement definitionsObject;
        var hasDefinitions = expressionValidationConfig.TryGetProperty("definitions", out definitionsObject);
        if (hasDefinitions)
        {
            foreach (var definitionObject in definitionsObject.EnumerateObject())
            {
                var name = definitionObject.Name;
                var definition = definitionObject.Value;
                var resolvedDefinition = ResolveValidationDefinition(name, definition, expressionValidationDefinitions, logger);
                if (resolvedDefinition == null)
                {
                    logger.LogError("Validation definition {name} could not be resolved", name);
                    continue;
                }
                expressionValidationDefinitions[name] = resolvedDefinition;
            }
        }
        var expressionValidations = new Dictionary<string, List<ExpressionValidation>>();
        JsonElement validationsObject;
        var hasValidations = expressionValidationConfig.TryGetProperty("validations", out validationsObject);
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
                    var resolvedExpressionValidation = ResolveExpressionValidation(field, validation, expressionValidationDefinitions, logger);
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
