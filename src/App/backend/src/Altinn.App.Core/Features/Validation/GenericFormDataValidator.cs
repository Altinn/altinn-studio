using System.Diagnostics;
using System.Linq.Expressions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation;

/// <summary>
/// Simple wrapper for validation of form data that does the type checking for you.
/// </summary>
/// <typeparam name="TModel">The type of the model this class will validate</typeparam>
public abstract class GenericFormDataValidator<TModel> : IFormDataValidator
{
    /// <summary>
    /// Constructor to force the DataType to be set.
    /// </summary>
    /// <param name="dataType">The data type this validator should run on</param>
    protected GenericFormDataValidator(string dataType)
    {
        DataType = dataType;
    }

    /// <inheritdoc />
    public string DataType { get; private init; }

    // Add virtual members so that inheriting classes can override them if needed.
    // Default implementations from the interface are not virtual, so we need to copy them here.
    /// <inheritdoc/>
    public virtual string ValidationSource => $"{GetType().FullName}-{DataType}";

    /// <inheritdoc/>
    public virtual bool NoIncrementalValidation => false;

    // ReSharper disable once StaticMemberInGenericType
    private static readonly AsyncLocal<List<ValidationIssue>> _validationIssues = new();

    /// <summary>
    /// Default implementation that respects the runFor prefixes.
    /// </summary>
    public bool HasRelevantChanges(object current, object previous)
    {
        if (current is not TModel currentCast)
        {
            throw new Exception(
                $"{GetType().Name} wants to run on data type {DataType}, but the data is of type {current?.GetType().Name}. It should be of type {typeof(TModel).Name}"
            );
        }

        if (previous is not TModel previousCast)
        {
            throw new Exception(
                $"{GetType().Name} wants to run on data type {DataType}, but the previous of type {previous?.GetType().Name}. It should be of type {typeof(TModel).Name}"
            );
        }

        return HasRelevantChanges(currentCast, previousCast);
    }

    /// <summary>
    /// Convenience method to create a validation issue for a field using a linq expression instead of a json path for field
    /// </summary>
    /// <param name="selector">An expression that is used to attach the issue to a path in the data model</param>
    /// <param name="textKey">The key used to lookup translations for the issue (displayed if lookup fails)</param>
    /// <param name="severity">The severity for the issue (default Error)</param>
    /// <param name="description">Optional description if you want to provide a user friendly message that don't rely on the translation system</param>
    /// <param name="code">optional short code for the type of issue</param>
    /// <param name="customTextParameters">Dictionary of parameters to replace after looking up the translation.</param>
    protected void CreateValidationIssue<T>(
        Expression<Func<TModel, T>> selector,
        string textKey,
        ValidationIssueSeverity severity = ValidationIssueSeverity.Error,
        string? description = null,
        string? code = null,
        Dictionary<string, string>? customTextParameters = null
    )
    {
        Debug.Assert(_validationIssues.Value is not null);
        AddValidationIssue(
            new ValidationIssue
            {
                Field = LinqExpressionHelpers.GetJsonPath(selector),
                Description = description,
                Code = code,
                CustomTextKey = textKey,
                CustomTextParameters = customTextParameters,
                Severity = severity,
            }
        );
    }

    /// <summary>
    /// Allows inheriting classes to add validation issues.
    /// </summary>
    protected void AddValidationIssue(ValidationIssue issue)
    {
        Debug.Assert(_validationIssues.Value is not null);
        _validationIssues.Value.Add(issue);
    }

    /// <summary>
    /// Implementation of the generic <see cref="IFormDataValidator"/> interface to call the correctly typed
    /// validation method implemented by the inheriting class.
    /// </summary>
    public async Task<List<ValidationIssue>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        object data,
        string? language
    )
    {
        if (data is not TModel model)
        {
            throw new ArgumentException($"Data is not of type {typeof(TModel)}");
        }

        _validationIssues.Value = new List<ValidationIssue>();
        await ValidateFormData(instance, dataElement, model, language);
        return _validationIssues.Value;
    }

    /// <summary>
    /// Implement this method to validate the data.
    /// </summary>
    protected abstract Task ValidateFormData(Instance instance, DataElement dataElement, TModel data, string? language);

    /// <summary>
    /// Implement this method to check if the data has changed in a way that requires validation.
    /// </summary>
    /// <param name="current">The current data model after applying patches and data processing</param>
    /// <param name="previous">The previous state before patches and data processing</param>
    /// <returns>true if the list of validation issues might be different on the two model states</returns>
    protected abstract bool HasRelevantChanges(TModel current, TModel previous);
}
