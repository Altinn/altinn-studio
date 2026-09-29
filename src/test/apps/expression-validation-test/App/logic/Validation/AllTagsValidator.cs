using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Models;

namespace Altinn.App.logic.Validation;

public class AllTagsValidator(IAppOptionsService appOptionsService) : IValidator
{
    public string TaskId { get; } = "Task_1";

    public Task<bool> HasRelevantChanges(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges changes)
    {
        return Task.FromResult(true);
    }

    public async Task<List<ValidationIssue>> Validate(IInstanceDataAccessor dataAccessor, string taskId, string? language)
    {
        var dataElement = dataAccessor.Instance.Data.First(e => e.DataType == "skjema");
        var formData = await dataAccessor.GetFormData<skjema>(dataElement);
        List<ValidationIssue> validationIssues = new List<ValidationIssue>();

        if (formData?.root is not { SF_validatetags: true })
        {
            return validationIssues;
        }

        var files = dataAccessor.Instance.Data.Where(e => e.DataType == "vedlegg-cv").ToList();
        var allTags = files.SelectMany(f => f.Tags).Distinct().ToList();
        var options = await appOptionsService.GetOptionsAsync("applicationdocs", language, new Dictionary<string, string>());

        var documentOptions = options.Options
            ?? throw new InvalidOperationException("Expected the 'applicationdocs' options to be configured.");

        foreach (var option in documentOptions)
        {
            if (!allTags.Contains(option.Value))
            {
                validationIssues.Add(new ValidationIssue
                {
                    Severity = ValidationIssueSeverity.Error,
                    Code = ValidationIssueCodes.DataElementCodes.MissingContentType,
                    DataElementId = dataElement.Id,
                    CustomTextKey = $"Du må laste opp '{option.Label}'",
                    Field = "root.vedlegg"
                });
            }
        }

        return validationIssues;
    }

}
