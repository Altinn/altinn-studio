using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Validation.Helpers;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Runs <see cref="System.ComponentModel.DataAnnotations"/> validation on the data object.
/// </summary>
public class DataAnnotationValidator : IFormDataValidator
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IObjectModelValidator _objectModelValidator;
    private readonly GeneralSettings _generalSettings;

    /// <summary>
    /// Constructor
    /// </summary>
    public DataAnnotationValidator(IHttpContextAccessor httpContextAccessor, IObjectModelValidator objectModelValidator, IOptions<GeneralSettings> generalSettings)
    {
        _httpContextAccessor = httpContextAccessor;
        _objectModelValidator = objectModelValidator;
        _generalSettings = generalSettings.Value;
    }

    /// <summary>
    /// Run Data annotation validation on all data types with app logic
    /// </summary>
    public string DataType => "*";

    /// <summary>
    /// This validator has the code "DataAnnotations" and this is known by the frontend, who may request this validator to not run for incremental validation.
    /// </summary>
    public string ValidationSource => "DataAnnotations";

    /// <summary>
    /// We don't know which fields are relevant for data annotation validation, so we always run it.
    /// </summary>
    public bool HasRelevantChanges(object current, object previous) => true;

    /// <inheritdoc />
    public Task<List<ValidationIssue>> ValidateFormData(Instance instance, DataElement dataElement, object data)
    {
        try
        {
            var modelState = new ModelStateDictionary();
            var actionContext = new ActionContext(
                _httpContextAccessor.HttpContext!,
                new Microsoft.AspNetCore.Routing.RouteData(),
                new ActionDescriptor(),
                modelState);
            ValidationStateDictionary validationState = new ValidationStateDictionary();
            _objectModelValidator.Validate(actionContext, validationState, null!, data);

            return Task.FromResult(ModelStateHelpers.ModelStateToIssueList(modelState, instance, dataElement, _generalSettings, data.GetType(), ValidationIssueSources.ModelState));
        }
        catch (Exception e)
        {
            return Task.FromException<List<ValidationIssue>>(e);
        }
    }
}