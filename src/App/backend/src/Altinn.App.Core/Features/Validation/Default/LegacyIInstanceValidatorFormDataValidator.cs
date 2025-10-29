#pragma warning disable CS0618 // Type or member is obsolete
using System.Diagnostics;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Validation.Helpers;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// This validator is used to run the legacy IInstanceValidator.ValidateData method
/// </summary>
public class LegacyIInstanceValidatorFormDataValidator : IValidator
{
    private readonly IInstanceValidator _instanceValidator;
    private readonly GeneralSettings _generalSettings;

    /// <summary>
    /// constructor
    /// </summary>
    public LegacyIInstanceValidatorFormDataValidator(
        IOptions<GeneralSettings> generalSettings,
        /* altinn:injection:ignore */
        IInstanceValidator instanceValidator
    )
    {
        _instanceValidator = instanceValidator;
        _generalSettings = generalSettings.Value;
    }

    /// <summary>
    /// The legacy validator should run for all tasks, because there is no way to specify task for the legacy validator
    /// </summary>
    public string TaskId => "*";

    /// <inheritdoc />>
    public string ValidationSource
    {
        get
        {
            var type = _instanceValidator?.GetType() ?? GetType();
            Debug.Assert(type.FullName is not null, "FullName does not return null on class/struct types");
            return type.FullName + "_FormData";
        }
    }

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    )
    {
        var issues = new List<ValidationIssue>();
        foreach (var (_, dataElement) in dataAccessor.GetDataElementsWithFormDataForTask(taskId))
        {
            var data = await dataAccessor.GetFormData(dataElement);
            var modelState = new ModelStateDictionary();
            await _instanceValidator.ValidateData(data, modelState);
            issues.AddRange(
                ModelStateHelpers.ModelStateToIssueList(
                    modelState,
                    dataAccessor.Instance,
                    dataElement,
                    _generalSettings,
                    data.GetType()
                )
            );
        }

        return issues;
    }

    /// <summary>
    /// Always run for incremental validation, because the legacy validator don't have a way to know when changes are relevant
    /// </summary>
    public Task<bool> HasRelevantChanges(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges changes)
    {
        return Task.FromResult(true);
    }
}
