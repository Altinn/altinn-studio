#pragma warning disable CS0618 // Type or member is obsolete
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Validation.Helpers;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// This validator is used to run the legacy IInstanceValidator.ValidateData method
/// </summary>
public class LegacyIInstanceValidatorFormDataValidator : IFormDataValidator
{
    private readonly IInstanceValidator? _instanceValidator;
    private readonly GeneralSettings _generalSettings;

    /// <summary>
    /// constructor
    /// </summary>
    public LegacyIInstanceValidatorFormDataValidator(
        IOptions<GeneralSettings> generalSettings,
        IInstanceValidator? instanceValidator = null
    )
    {
        _instanceValidator = instanceValidator;
        _generalSettings = generalSettings.Value;
    }

    /// <summary>
    /// The legacy validator should run for all data types
    /// </summary>
    public string DataType => _instanceValidator is null ? "" : "*";

    /// <inheritdoc />>
    public string ValidationSource => _instanceValidator?.GetType().FullName ?? GetType().FullName!;

    /// <summary>
    /// Always run for incremental validation (if it exists)
    /// </summary>
    public bool HasRelevantChanges(object current, object previous) => _instanceValidator is not null;

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        object data,
        string? language
    )
    {
        if (_instanceValidator is null)
        {
            return new List<ValidationIssue>();
        }

        var modelState = new ModelStateDictionary();
        await _instanceValidator.ValidateData(data, modelState);
        return ModelStateHelpers.ModelStateToIssueList(
            modelState,
            instance,
            dataElement,
            _generalSettings,
            data.GetType(),
            ValidationIssueSources.Custom
        );
    }
}
