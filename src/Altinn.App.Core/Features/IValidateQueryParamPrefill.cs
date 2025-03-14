using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Features;

/// <summary>
/// Allows service owners to validate values of prefill from query params
/// </summary>
[ImplementableByApps]
public interface IValidateQueryParamPrefill
{
    /// <summary>
    /// Use this method to run the validations
    /// </summary>
    /// <param name="prefill">The prefilled params to validate</param>
    /// <returns>null if valid, <see cref="ValidationIssue"/> if there is a problem</returns>
    public Task<ValidationIssue?> PrefillFromQueryParamsIsValid(Dictionary<string, string> prefill);
}
