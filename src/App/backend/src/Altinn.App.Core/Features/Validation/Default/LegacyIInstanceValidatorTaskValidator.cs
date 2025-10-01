#pragma warning disable CS0618 // Type or member is obsolete
using System.Diagnostics;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Validation.Helpers;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Ensures that the old <see cref="IInstanceValidator.ValidateTask(Instance, string, ModelStateDictionary)"/> extension hook is still supported.
/// </summary>
public class LegacyIInstanceValidatorTaskValidator : IValidator
{
    private readonly IInstanceValidator _instanceValidator;
    private readonly GeneralSettings _generalSettings;

    /// <summary>
    /// Constructor
    /// </summary>
    public LegacyIInstanceValidatorTaskValidator(
        IOptions<GeneralSettings> generalSettings,
        /* altinn:injection:ignore */
        IInstanceValidator instanceValidator
    )
    {
        _generalSettings = generalSettings.Value;
        _instanceValidator = instanceValidator;
    }

    /// <summary>
    /// Run the legacy validator for all tasks
    /// </summary>
    public string TaskId => "*";

    /// <inheritdoc />
    public string ValidationSource
    {
        get
        {
            var type = _instanceValidator.GetType();
            Debug.Assert(type.FullName is not null, "FullName does not return null on class/struct types");
            return type.FullName;
        }
    }

    /// <inheritdoc />
    public bool NoIncrementalValidation => true;

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    )
    {
        var modelState = new ModelStateDictionary();
        await _instanceValidator.ValidateTask(dataAccessor.Instance, taskId, modelState);
        return ModelStateHelpers.MapModelStateToIssueList(modelState, dataAccessor.Instance, _generalSettings);
    }

    /// <summary>
    /// Don't run the legacy Instance validator for incremental validation (it was not running before)
    /// </summary>
    public Task<bool> HasRelevantChanges(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges changes)
    {
        throw new NotImplementedException(
            "Validators with NoIncrementalValidation should not be used for incremental validation"
        );
    }
}
