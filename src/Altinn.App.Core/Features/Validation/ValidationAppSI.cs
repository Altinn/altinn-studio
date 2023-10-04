using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Validation
{
    /// <summary>
    /// Represents a validation service for validating instances and their data elements
    /// </summary>
    public class ValidationAppSI : IValidation
    {
        private readonly ILogger _logger;
        private readonly IDataClient _dataClient;
        private readonly IInstanceClient _instanceClient;
        private readonly IInstanceValidator _instanceValidator;
        private readonly IAppModel _appModel;
        private readonly IAppResources _appResourcesService;
        private readonly IAppMetadata _appMetadata;
        private readonly LayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;
        private readonly IObjectModelValidator _objectModelValidator;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GeneralSettings _generalSettings;
        private readonly AppSettings _appSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="ValidationAppSI"/> class.
        /// </summary>
        public ValidationAppSI(
            ILogger<ValidationAppSI> logger,
            IDataClient dataClient,
            IInstanceClient instanceClient,
            IInstanceValidator instanceValidator,
            IAppModel appModel,
            IAppResources appResourcesService,
            IAppMetadata appMetadata,
            IObjectModelValidator objectModelValidator,
            LayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
            IHttpContextAccessor httpContextAccessor,
            IOptions<GeneralSettings> generalSettings,
            IOptions<AppSettings> appSettings)
        {
            _logger = logger;
            _dataClient = dataClient;
            _instanceClient = instanceClient;
            _instanceValidator = instanceValidator;
            _appModel = appModel;
            _appResourcesService = appResourcesService;
            _appMetadata = appMetadata;
            _objectModelValidator = objectModelValidator;
            _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
            _httpContextAccessor = httpContextAccessor;
            _generalSettings = generalSettings.Value;
            _appSettings = appSettings.Value;
        }

        /// <summary>
        /// Validate an instance for a specified process step.
        /// </summary>
        /// <param name="instance">The instance to validate</param>
        /// <param name="taskId">The task to validate the instance for.</param>
        /// <returns>A list of validation errors if any were found</returns>
        public async Task<List<ValidationIssue>> ValidateAndUpdateProcess(Instance instance, string taskId)
        {
            _logger.LogInformation("Validation of {instance.Id}", instance.Id);

            List<ValidationIssue> messages = new List<ValidationIssue>();

            ModelStateDictionary validationResults = new ModelStateDictionary();
            await _instanceValidator.ValidateTask(instance, taskId, validationResults);
            messages.AddRange(MapModelStateToIssueList(validationResults, instance));

            Application application = await _appMetadata.GetApplicationMetadata();

            foreach (DataType dataType in application.DataTypes.Where(et => et.TaskId == taskId))
            {
                List<DataElement> elements = instance.Data.Where(d => d.DataType == dataType.Id).ToList();

                if (dataType.MaxCount > 0 && dataType.MaxCount < elements.Count)
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        InstanceId = instance.Id,
                        Code = ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType,
                        Severity = ValidationIssueSeverity.Error,
                        Description = ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType,
                        Field = dataType.Id
                    };
                    messages.Add(message);
                }

                if (dataType.MinCount > 0 && dataType.MinCount > elements.Count)
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        InstanceId = instance.Id,
                        Code = ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType,
                        Severity = ValidationIssueSeverity.Error,
                        Description = ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType,
                        Field = dataType.Id
                    };
                    messages.Add(message);
                }

                foreach (DataElement dataElement in elements)
                {
                    messages.AddRange(await ValidateDataElement(instance, dataType, dataElement));
                }
            }

            instance.Process.CurrentTask.Validated = new ValidationStatus
            {
                // The condition for completion is met if there are no errors (or other weirdnesses).
                CanCompleteTask = messages.Count == 0 ||
                                  messages.All(m => m.Severity != ValidationIssueSeverity.Error && m.Severity != ValidationIssueSeverity.Unspecified),
                Timestamp = DateTime.Now
            };

            await _instanceClient.UpdateProcess(instance);
            return messages;
        }

        /// <summary>
        /// Validate a specific data element.
        /// </summary>
        /// <param name="instance">The instance where the data element belong</param>
        /// <param name="dataType">The datatype describing the data element requirements</param>
        /// <param name="dataElement">The metadata of a data element to validate</param>
        /// <returns>A list of validation errors if any were found</returns>
        public async Task<List<ValidationIssue>> ValidateDataElement(Instance instance, DataType dataType, DataElement dataElement)
        {
            _logger.LogInformation("Validation of data element {dataElement.Id} of instance {instance.Id}", dataElement.Id, instance.Id);

            List<ValidationIssue> messages = new List<ValidationIssue>();

            if (dataElement.ContentType == null)
            {
                ValidationIssue message = new ValidationIssue
                {
                    InstanceId = instance.Id,
                    Code = ValidationIssueCodes.DataElementCodes.MissingContentType,
                    DataElementId = dataElement.Id,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ValidationIssueCodes.DataElementCodes.MissingContentType
                };
                messages.Add(message);
            }
            else
            {
                string contentTypeWithoutEncoding = dataElement.ContentType.Split(";")[0];

                if (dataType.AllowedContentTypes != null && dataType.AllowedContentTypes.Count > 0 && dataType.AllowedContentTypes.All(ct => !ct.Equals(contentTypeWithoutEncoding, StringComparison.OrdinalIgnoreCase)))
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        InstanceId = instance.Id,
                        DataElementId = dataElement.Id,
                        Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                        Severity = ValidationIssueSeverity.Error,
                        Description = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                        Field = dataType.Id
                    };
                    messages.Add(message);
                }
            }

            if (dataType.MaxSize.HasValue && dataType.MaxSize > 0 && (long)dataType.MaxSize * 1024 * 1024 < dataElement.Size)
            {
                ValidationIssue message = new ValidationIssue
                {
                    InstanceId = instance.Id,
                    DataElementId = dataElement.Id,
                    Code = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
                    Field = dataType.Id
                };
                messages.Add(message);
            }

            if (dataType.EnableFileScan && dataElement.FileScanResult == FileScanResult.Infected)
            {
                ValidationIssue message = new ValidationIssue()
                {
                    InstanceId = instance.Id,
                    DataElementId = dataElement.Id,
                    Code = ValidationIssueCodes.DataElementCodes.DataElementFileInfected,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ValidationIssueCodes.DataElementCodes.DataElementFileInfected,
                    Field = dataType.Id
                };
                messages.Add(message);
            }

            if (dataType.EnableFileScan && dataType.ValidationErrorOnPendingFileScan && dataElement.FileScanResult == FileScanResult.Pending)
            {
                ValidationIssue message = new ValidationIssue()
                {
                    InstanceId = instance.Id,
                    DataElementId = dataElement.Id,
                    Code = ValidationIssueCodes.DataElementCodes.DataElementFileScanPending,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ValidationIssueCodes.DataElementCodes.DataElementFileScanPending,
                    Field = dataType.Id
                };
                messages.Add(message);
            }

            if (dataType.AppLogic?.ClassRef != null)
            {
                Type modelType = _appModel.GetModelType(dataType.AppLogic.ClassRef);
                Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
                string app = instance.AppId.Split("/")[1];
                int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                object data = await _dataClient.GetFormData(
                    instanceGuid, modelType, instance.Org, app, instanceOwnerPartyId, Guid.Parse(dataElement.Id));

                LayoutEvaluatorState? evaluationState = null;

                // Remove hidden data before validation
                if (_appSettings.RequiredValidation || _appSettings.ExpressionValidation)
                {

                    var layoutSet = _appResourcesService.GetLayoutSetForTask(dataType.TaskId);
                    evaluationState = await _layoutEvaluatorStateInitializer.Init(instance, data, layoutSet?.Id);
                    LayoutEvaluator.RemoveHiddenData(evaluationState, RowRemovalOption.SetToNull);
                }

                // Evaluate expressions in layout and validate that all required data is included and that maxLength
                // is respected on groups
                if (_appSettings.RequiredValidation)
                {
                    var layoutErrors = LayoutEvaluator.RunLayoutValidationsForRequired(evaluationState!, dataElement.Id);
                    messages.AddRange(layoutErrors);
                }

                // Run expression validations
                if (_appSettings.ExpressionValidation)
                {
                    var expressionErrors = ExpressionValidator.Validate(dataType.Id, _appResourcesService, new DataModel(data), evaluationState!, _logger);
                    messages.AddRange(expressionErrors);
                }

                // Run Standard mvc validation using the System.ComponentModel.DataAnnotations
                ModelStateDictionary dataModelValidationResults = new ModelStateDictionary();
                var actionContext = new ActionContext(
                    _httpContextAccessor.HttpContext,
                    new Microsoft.AspNetCore.Routing.RouteData(),
                    new ActionDescriptor(),
                    dataModelValidationResults);
                ValidationStateDictionary validationState = new ValidationStateDictionary();
                _objectModelValidator.Validate(actionContext, validationState, null, data);

                if (!dataModelValidationResults.IsValid)
                {
                    messages.AddRange(MapModelStateToIssueList(actionContext.ModelState, ValidationIssueSources.ModelState, instance, dataElement.Id, data.GetType()));
                }

                // Call custom validation from the IInstanceValidator
                ModelStateDictionary customValidationResults = new ModelStateDictionary();
                await _instanceValidator.ValidateData(data, customValidationResults);

                if (!customValidationResults.IsValid)
                {
                    messages.AddRange(MapModelStateToIssueList(customValidationResults, ValidationIssueSources.Custom, instance, dataElement.Id, data.GetType()));
                }

            }

            return messages;
        }

        private List<ValidationIssue> MapModelStateToIssueList(
            ModelStateDictionary modelState,
            string source,
            Instance instance,
            string dataElementId,
            Type modelType)
        {
            List<ValidationIssue> validationIssues = new List<ValidationIssue>();

            foreach (string modelKey in modelState.Keys)
            {
                modelState.TryGetValue(modelKey, out ModelStateEntry? entry);

                if (entry != null && entry.ValidationState == ModelValidationState.Invalid)
                {
                    foreach (ModelError error in entry.Errors)
                    {
                        var severityAndMessage = GetSeverityFromMessage(error.ErrorMessage);
                        validationIssues.Add(new ValidationIssue
                        {
                            InstanceId = instance.Id,
                            DataElementId = dataElementId,
                            Source = source,
                            Code = severityAndMessage.Message,
                            Field = ModelKeyToField(modelKey, modelType)!,
                            Severity = severityAndMessage.Severity,
                            Description = severityAndMessage.Message
                        });
                    }
                }
            }

            return validationIssues;
        }

        /// <summary>
        /// Translate the ModelKey from validation to a field that respects [JsonPropertyName] annotations
        /// </summary>
        /// <remarks>
        ///  Will be obsolete when updating to net70 or higher and activating https://learn.microsoft.com/en-us/aspnet/core/mvc/models/validation?view=aspnetcore-7.0#use-json-property-names-in-validation-errors
        /// </remarks>
        public static string? ModelKeyToField(string? modelKey, Type data)
        {
            var keyParts = modelKey?.Split('.', 2);
            var keyWithIndex = keyParts?.ElementAtOrDefault(0)?.Split('[', 2);
            var key = keyWithIndex?.ElementAtOrDefault(0);
            var index = keyWithIndex?.ElementAtOrDefault(1); // with traling ']', eg: "3]"
            var rest = keyParts?.ElementAtOrDefault(1);

            var property = data?.GetProperties()?.FirstOrDefault(p => p.Name == key);
            var jsonPropertyName = property
                ?.GetCustomAttributes(true)
                .OfType<System.Text.Json.Serialization.JsonPropertyNameAttribute>()
                .FirstOrDefault()
                ?.Name;
            if (jsonPropertyName is null)
            {
                jsonPropertyName = key;
            }

            if (index is not null)
            {
                jsonPropertyName = jsonPropertyName + '[' + index;
            }

            if (rest is null)
            {
                return jsonPropertyName;
            }

            var childType = property?.PropertyType;

            // Get the Parameter of IEnumerable properties, if they are not string
            if (childType is not null && childType != typeof(string) && childType.IsAssignableTo(typeof(System.Collections.IEnumerable)))
            {
                childType = childType.GetInterfaces()
                    .Where(t => t.IsGenericType && t.GetGenericTypeDefinition() == typeof(IEnumerable<>))
                    .Select(t => t.GetGenericArguments()[0]).FirstOrDefault();
            }

            if (childType is null)
            {
                // Give up and return rest, if the child type is not found.
                return $"{jsonPropertyName}.{rest}";
            }

            return $"{jsonPropertyName}.{ModelKeyToField(rest, childType)}";
        }

        private List<ValidationIssue> MapModelStateToIssueList(ModelStateDictionary modelState, Instance instance)
        {
            List<ValidationIssue> validationIssues = new List<ValidationIssue>();

            foreach (string modelKey in modelState.Keys)
            {
                modelState.TryGetValue(modelKey, out ModelStateEntry? entry);

                if (entry != null && entry.ValidationState == ModelValidationState.Invalid)
                {
                    foreach (ModelError error in entry.Errors)
                    {
                        var severityAndMessage = GetSeverityFromMessage(error.ErrorMessage);
                        validationIssues.Add(new ValidationIssue
                        {
                            InstanceId = instance.Id,
                            Code = severityAndMessage.Message,
                            Severity = severityAndMessage.Severity,
                            Description = severityAndMessage.Message
                        });
                    }
                }
            }

            return validationIssues;
        }

        private (ValidationIssueSeverity Severity, string Message) GetSeverityFromMessage(string originalMessage)
        {
            if (originalMessage.StartsWith(_generalSettings.SoftValidationPrefix))
            {
                return (ValidationIssueSeverity.Warning,
                    originalMessage.Remove(0, _generalSettings.SoftValidationPrefix.Length));
            }

            if (_generalSettings.FixedValidationPrefix != null
                && originalMessage.StartsWith(_generalSettings.FixedValidationPrefix))
            {
                return (ValidationIssueSeverity.Fixed,
                    originalMessage.Remove(0, _generalSettings.FixedValidationPrefix.Length));
            }

            if (originalMessage.StartsWith(_generalSettings.InfoValidationPrefix))
            {
                return (ValidationIssueSeverity.Informational,
                    originalMessage.Remove(0, _generalSettings.InfoValidationPrefix.Length));
            }

            if (originalMessage.StartsWith(_generalSettings.SuccessValidationPrefix))
            {
                return (ValidationIssueSeverity.Success,
                    originalMessage.Remove(0, _generalSettings.SuccessValidationPrefix.Length));
            }

            return (ValidationIssueSeverity.Error, originalMessage);
        }
    }
}
