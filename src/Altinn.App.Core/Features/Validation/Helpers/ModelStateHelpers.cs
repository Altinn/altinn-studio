using System.Collections;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.App.Core.Features.Validation.Helpers;

/// <summary>
/// Static helpers to make map from <see cref="ModelStateDictionary"/> to list of <see cref="ValidationIssue"/>
/// </summary>
public static class ModelStateHelpers
{
    /// <summary>
    /// Get a list of issues from a <see cref="ModelStateDictionary" />
    /// </summary>
    /// <param name="modelState"></param>
    /// <param name="instance">The instance used for populating issue.InstanceId</param>
    /// <param name="dataElement">Data element for populating issue.DataElementId</param>
    /// <param name="generalSettings">General settings to get *Fixed* prefixes</param>
    /// <param name="objectType">Type of the object to map ModelStateDictionary key to the json path field (might be different)</param>
    /// <returns>A list of the issues as our standard ValidationIssue</returns>
    public static List<ValidationIssue> ModelStateToIssueList(
        ModelStateDictionary modelState,
        Instance instance,
        DataElement dataElement,
        GeneralSettings generalSettings,
        Type objectType
    )
    {
        var validationIssues = new List<ValidationIssue>();

        foreach (var modelKey in modelState.Keys)
        {
            modelState.TryGetValue(modelKey, out var entry);

            if (entry is { ValidationState: ModelValidationState.Invalid })
            {
                foreach (var error in entry.Errors)
                {
                    var severityAndMessage = GetSeverityFromMessage(error.ErrorMessage, generalSettings);
                    validationIssues.Add(
                        new ValidationIssue
                        {
                            DataElementId = dataElement.Id,
                            Code = severityAndMessage.Message,
                            Field = ModelKeyToField(modelKey, objectType),
                            Severity = severityAndMessage.Severity,
                            Description = severityAndMessage.Message,
                        }
                    );
                }
            }
        }

        return validationIssues;
    }

    private static (ValidationIssueSeverity Severity, string Message) GetSeverityFromMessage(
        string originalMessage,
        GeneralSettings generalSettings
    )
    {
        if (originalMessage.StartsWith(generalSettings.SoftValidationPrefix, StringComparison.Ordinal))
        {
            return (
                ValidationIssueSeverity.Warning,
                originalMessage.Remove(0, generalSettings.SoftValidationPrefix.Length)
            );
        }

#pragma warning disable CS0618 // Type or member is obsolete
        if (originalMessage.StartsWith(generalSettings.FixedValidationPrefix, StringComparison.Ordinal))
        {
            return (
                ValidationIssueSeverity.Fixed,
                originalMessage.Remove(0, generalSettings.FixedValidationPrefix.Length)
            );
        }
#pragma warning restore CS0618 // Type or member is obsolete

        if (originalMessage.StartsWith(generalSettings.InfoValidationPrefix, StringComparison.Ordinal))
        {
            return (
                ValidationIssueSeverity.Informational,
                originalMessage.Remove(0, generalSettings.InfoValidationPrefix.Length)
            );
        }

        if (originalMessage.StartsWith(generalSettings.SuccessValidationPrefix, StringComparison.Ordinal))
        {
            return (
                ValidationIssueSeverity.Success,
                originalMessage.Remove(0, generalSettings.SuccessValidationPrefix.Length)
            );
        }

        return (ValidationIssueSeverity.Error, originalMessage);
    }

    /// <summary>
    ///     Translate the ModelKey from validation to a field that respects [JsonPropertyName] annotations
    /// </summary>
    /// <remarks>
    ///     Will be obsolete when updating to net70 or higher and activating
    ///     https://learn.microsoft.com/en-us/aspnet/core/mvc/models/validation?view=aspnetcore-7.0#use-json-property-names-in-validation-errors
    /// </remarks>
    public static string? ModelKeyToField(string? modelKey, Type data)
    {
        var keyParts = modelKey?.Split('.', 2);
        var keyWithIndex = keyParts?.ElementAtOrDefault(0)?.Split('[', 2);
        var key = keyWithIndex?.ElementAtOrDefault(0);
        var index = keyWithIndex?.ElementAtOrDefault(1); // with traling ']', eg: "3]"
        var rest = keyParts?.ElementAtOrDefault(1);

        var properties = data?.GetProperties();
        var property = properties is not null ? Array.Find(properties, p => p.Name == key) : null;
        var jsonPropertyName = property
            ?.GetCustomAttributes(true)
            .OfType<JsonPropertyNameAttribute>()
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
        if (childType is not null && childType != typeof(string) && childType.IsAssignableTo(typeof(IEnumerable)))
        {
            childType = childType
                .GetInterfaces()
                .Where(t => t.IsGenericType && t.GetGenericTypeDefinition() == typeof(IEnumerable<>))
                .Select(t => t.GetGenericArguments()[0])
                .FirstOrDefault();
        }

        if (childType is null)
        {
            // Give up and return rest, if the child type is not found.
            return $"{jsonPropertyName}.{rest}";
        }

        return $"{jsonPropertyName}.{ModelKeyToField(rest, childType)}";
    }

    /// <summary>
    /// Same as <see cref="ModelStateToIssueList"/>, but without information about a specific field
    /// used by <see cref="LegacyIInstanceValidatorTaskValidator"/>
    /// </summary>
    public static List<ValidationIssue> MapModelStateToIssueList(
        ModelStateDictionary modelState,
        Instance instance,
        GeneralSettings generalSettings
    )
    {
        var validationIssues = new List<ValidationIssue>();

        foreach (var modelKey in modelState.Keys)
        {
            modelState.TryGetValue(modelKey, out var entry);

            if (entry != null && entry.ValidationState == ModelValidationState.Invalid)
            {
                foreach (var error in entry.Errors)
                {
                    var severityAndMessage = GetSeverityFromMessage(error.ErrorMessage, generalSettings);
                    validationIssues.Add(
                        new ValidationIssue
                        {
                            Code = severityAndMessage.Message,
                            Severity = severityAndMessage.Severity,
                            Description = severityAndMessage.Message,
                        }
                    );
                }
            }
        }

        return validationIssues;
    }
}
