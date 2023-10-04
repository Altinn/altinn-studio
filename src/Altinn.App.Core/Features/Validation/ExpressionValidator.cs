using System.Text.Json;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Validation;
using Microsoft.Extensions.Logging;


namespace Altinn.App.Core.Features.Validation
{
    /// <summary>
    /// Validates form data against expression validations
    /// </summary>
    public static class ExpressionValidator
    {
        /// <inheritdoc />
        public static IEnumerable<ValidationIssue> Validate(string dataType, IAppResources appResourceService, IDataModelAccessor dataModel, LayoutEvaluatorState evaluatorState, ILogger logger)
        {
            var rawValidationConfig = appResourceService.GetValidationConfiguration(dataType);
            if (rawValidationConfig == null)
            {
                // No validation configuration exists for this data type
                return new List<ValidationIssue>();
            }

            var validationConfig = JsonDocument.Parse(rawValidationConfig).RootElement;
            return Validate(validationConfig, dataModel, evaluatorState, logger);
        }

        /// <inheritdoc />
        public static IEnumerable<ValidationIssue> Validate(JsonElement validationConfig, IDataModelAccessor dataModel, LayoutEvaluatorState evaluatorState, ILogger logger)
        {
            var validationIssues = new List<ValidationIssue>();
            var expressionValidations = ParseExpressionValidationConfig(validationConfig, logger);
            foreach (var validationObject in expressionValidations)
            {
                var baseField = validationObject.Key;
                var resolvedFields = dataModel.GetResolvedKeys(baseField);
                var validations = validationObject.Value;
                foreach (var resolvedField in resolvedFields)
                {
                    var positionalArguments = new[] { resolvedField };
                    foreach (var validation in validations)
                    {
                        try
                        {
                            if (validation.Condition == null)
                            {
                                continue;
                            }

                            var isInvalid = ExpressionEvaluator.EvaluateExpression(evaluatorState, validation.Condition, null, positionalArguments);
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
                        catch
                        {
                            logger.LogError($"Error while evaluating expression validation for {resolvedField}");
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
            var rawDefinition = definition.Deserialize<RawExpressionValidation>(new JsonSerializerOptions
            {
                ReadCommentHandling = JsonCommentHandling.Skip,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            });
            if (rawDefinition == null)
            {
                logger.LogError($"Validation definition {name} could not be parsed");
                return null;
            }
            if (rawDefinition.Ref != null)
            {
                var reference = resolvedDefinitions.GetValueOrDefault(rawDefinition.Ref);
                if (reference == null)
                {
                    logger.LogError($"Could not resolve reference {rawDefinition.Ref} for validation {name}");
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
                logger.LogError($"Validation {name} is missing message");
                return null;
            }

            if (resolvedDefinition.Condition == null)
            {
                logger.LogError($"Validation {name} is missing condition");
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
                    logger.LogError($"Could not resolve null reference for validation for field {field}");
                    return null;
                }
                var reference = resolvedDefinitions.GetValueOrDefault(stringReference);
                if (reference == null)
                {
                    logger.LogError($"Could not resolve reference {stringReference} for validation for field {field}");
                    return null;
                }
                rawExpressionValidatıon.Message = reference.Message;
                rawExpressionValidatıon.Condition = reference.Condition;
                rawExpressionValidatıon.Severity = reference.Severity;
            }
            else
            {
                var expressionDefinition = definition.Deserialize<RawExpressionValidation>(new JsonSerializerOptions
                {
                    ReadCommentHandling = JsonCommentHandling.Skip,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                });
                if (expressionDefinition == null)
                {
                    logger.LogError($"Validation for field {field} could not be parsed");
                    return null;
                }

                if (expressionDefinition.Ref != null)
                {
                    var reference = resolvedDefinitions.GetValueOrDefault(expressionDefinition.Ref);
                    if (reference == null)
                    {
                        logger.LogError($"Could not resolve reference {expressionDefinition.Ref} for validation for field {field}");
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
                logger.LogError($"Validation for field {field} is missing message");
                return null;
            }

            if (rawExpressionValidatıon.Condition == null)
            {
                logger.LogError($"Validation for field {field} is missing condition");
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
                        logger.LogError($"Validation definition {name} could not be resolved");
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
                        if (!expressionValidations.ContainsKey(field))
                        {
                            expressionValidations[field] = new List<ExpressionValidation>();
                        }
                        var resolvedExpressionValidation = ResolveExpressionValidation(field, validation, expressionValidationDefinitions, logger);
                        if (resolvedExpressionValidation == null)
                        {
                            logger.LogError($"Validation for field {field} could not be resolved");
                            continue;
                        }
                        expressionValidations[field].Add(resolvedExpressionValidation);
                    }
                }
            }
            return expressionValidations;
        }
    }
}
