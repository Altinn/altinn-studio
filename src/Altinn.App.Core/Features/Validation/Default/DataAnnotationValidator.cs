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
public class DataAnnotationValidator : IFormDataValidator // TODO: This should be IValidator
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IObjectModelValidator _objectModelValidator;
    private readonly GeneralSettings _generalSettings;

    /// <summary>
    /// Constructor
    /// </summary>
    public DataAnnotationValidator(
        IHttpContextAccessor httpContextAccessor,
        IObjectModelValidator objectModelValidator,
        IOptions<GeneralSettings> generalSettings
    )
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
    public string ValidationSource => ValidationIssueSources.DataAnnotations;

    /// <summary>
    /// We don't know which fields are relevant for data annotation validation, so we always run it.
    /// </summary>
    public bool HasRelevantChanges(object current, object previous) => true;

    /// <inheritdoc />
    public Task<List<ValidationIssue>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        object data,
        string? language
    )
    {
        try
        {
            var modelState = new ModelStateDictionary();
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext is null)
            {
                throw new Exception("Could not get HttpContext - must be in a request context to validate form data");
            }
            var actionContext = new ActionContext(
                httpContext,
                new Microsoft.AspNetCore.Routing.RouteData(),
                new ActionDescriptor(),
                modelState
            );
            ValidationStateDictionary validationState = new ValidationStateDictionary();
            // ! TODO: 'prefix' on the interfacee is non-nullable, but on the actual implementation
            // ! TODO: it seems to be nullable, so this should be safe..
            // ! TODO: https://github.com/dotnet/aspnetcore/blob/5ff2399a2b9ea6346dcdcf2cc8ba65fba67d035a/src/Mvc/Mvc.Core/src/ModelBinding/ObjectModelValidator.cs#L41
            _objectModelValidator.Validate(actionContext, validationState, null!, data);

            return Task.FromResult(
                ModelStateHelpers.ModelStateToIssueList(
                    modelState,
                    instance,
                    dataElement,
                    _generalSettings,
                    data.GetType()
                )
            );
        }
        catch (Exception e)
        {
            return Task.FromException<List<ValidationIssue>>(e);
        }
    }
}
