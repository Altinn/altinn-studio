using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Validator that runs the required rules in the layout
/// </summary>
public class RequiredLayoutValidator : IFormDataValidator
{
    private readonly LayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;
    private readonly IAppResources _appResourcesService;
    private readonly IAppMetadata _appMetadata;

    /// <summary>
    /// Initializes a new instance of the <see cref="RequiredLayoutValidator"/> class.
    /// </summary>
    public RequiredLayoutValidator(LayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer, IAppResources appResourcesService, IAppMetadata appMetadata)
    {
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
        _appResourcesService = appResourcesService;
        _appMetadata = appMetadata;
    }

    /// <summary>
    /// Run for all data types
    /// </summary>
    public string DataType => "*";

    /// <summary>
    /// This validator has the code "Required" and this is known by the frontend, who may request this validator to not run for incremental validation.
    /// </summary>
    public string ValidationSource => "Required";

    /// <summary>
    /// Always run for incremental validation
    /// </summary>
    public bool HasRelevantChanges(object current, object previous) => true;

    /// <summary>
    /// Validate the form data against the required rules in the layout
    /// </summary>
    public async Task<List<ValidationIssue>> ValidateFormData(Instance instance, DataElement dataElement, object data, string? language)
    {
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var layoutSet = _appResourcesService.GetLayoutSetForTask(appMetadata.DataTypes.First(dt=>dt.Id == dataElement.DataType).TaskId);
        var evaluationState = await _layoutEvaluatorStateInitializer.Init(instance, data, layoutSet?.Id);
        return LayoutEvaluator.RunLayoutValidationsForRequired(evaluationState, dataElement.Id);
    }
}