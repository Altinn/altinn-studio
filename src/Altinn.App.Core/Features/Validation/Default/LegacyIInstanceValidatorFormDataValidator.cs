#pragma warning disable CS0618 // Type or member is obsolete
using System.Diagnostics;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Validation.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// This validator is used to run the legacy IInstanceValidator.ValidateData method
/// </summary>
public class LegacyIInstanceValidatorFormDataValidator : IValidator
{
    private readonly IInstanceValidator _instanceValidator;
    private readonly IAppMetadata _appMetadata;
    private readonly GeneralSettings _generalSettings;

    /// <summary>
    /// constructor
    /// </summary>
    public LegacyIInstanceValidatorFormDataValidator(
        IOptions<GeneralSettings> generalSettings,
        IInstanceValidator instanceValidator,
        IAppMetadata appMetadata
    )
    {
        _instanceValidator = instanceValidator;
        _appMetadata = appMetadata;
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
            return type.FullName;
        }
    }

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> Validate(
        Instance instance,
        string taskId,
        string? language,
        IInstanceDataAccessor instanceDataAccessor
    )
    {
        var issues = new List<ValidationIssue>();
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var dataTypes = appMetadata.DataTypes.Where(d => d.TaskId == taskId).Select(d => d.Id).ToList();
        foreach (var dataElement in instance.Data.Where(d => dataTypes.Contains(d.DataType)))
        {
            var data = await instanceDataAccessor.Get(dataElement);
            var modelState = new ModelStateDictionary();
            await _instanceValidator.ValidateData(data, modelState);
            issues.AddRange(
                ModelStateHelpers.ModelStateToIssueList(
                    modelState,
                    instance,
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
    public Task<bool> HasRelevantChanges(
        Instance instance,
        string taskId,
        List<DataElementChange> changes,
        IInstanceDataAccessor instanceDataAccessor
    )
    {
        return Task.FromResult(true);
    }
}
