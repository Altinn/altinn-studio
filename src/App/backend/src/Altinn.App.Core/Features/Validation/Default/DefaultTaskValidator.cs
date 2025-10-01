using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Implement the default validation of DataElements based on the metadata in appMetadata
/// </summary>
public class DefaultTaskValidator : ITaskValidator //TODO: Implement IValidator
{
    private readonly IAppMetadata _appMetadata;

    /// <summary>
    /// Initializes a new instance of the <see cref="DefaultTaskValidator"/> class.
    /// </summary>
    public DefaultTaskValidator(IAppMetadata appMetadata)
    {
        _appMetadata = appMetadata;
    }

    /// <inheritdoc />
    public string TaskId => "*";

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> ValidateTask(Instance instance, string taskId, string? language)
    {
        var messages = new List<ValidationIssue>();
        var application = await _appMetadata.GetApplicationMetadata();

        foreach (var dataType in application.DataTypes.Where(et => et.TaskId == taskId))
        {
            List<DataElement> elements = instance.Data.Where(d => d.DataType == dataType.Id).ToList();

            if (dataType.MaxCount > 0 && dataType.MaxCount < elements.Count)
            {
                var message = new ValidationIssue
                {
                    Code = ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType,
                    Field = dataType.Id,
                };
                messages.Add(message);
            }

            if (dataType.MinCount > 0 && dataType.MinCount > elements.Count)
            {
                var message = new ValidationIssue
                {
                    Code = ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType,
                    Field = dataType.Id,
                };
                messages.Add(message);
            }
        }

        return messages;
    }
}
