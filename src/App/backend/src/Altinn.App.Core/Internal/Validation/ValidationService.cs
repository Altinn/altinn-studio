using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Main validation service that encapsulates all validation logic
/// </summary>
public class ValidationService : IValidationService
{
    private readonly IValidatorFactory _validatorFactory;
    private readonly ITranslationService _translationService;
    private readonly ILogger<ValidationService> _logger;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Constructor with DI services
    /// </summary>
    public ValidationService(
        IValidatorFactory validatorFactory,
        ITranslationService translationService,
        ILogger<ValidationService> logger,
        Telemetry? telemetry = null
    )
    {
        _validatorFactory = validatorFactory;
        _translationService = translationService;
        _logger = logger;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<List<ValidationIssueWithSource>> ValidateInstanceAtTask(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        List<string>? ignoredValidators,
        bool? onlyIncrementalValidators,
        string? language
    )
    {
        ArgumentNullException.ThrowIfNull(dataAccessor);
        ArgumentNullException.ThrowIfNull(dataAccessor.Instance);
        ArgumentNullException.ThrowIfNull(taskId);

        using var activity = _telemetry?.StartValidateInstanceAtTaskActivity(taskId);

        var validators = _validatorFactory.GetValidators(taskId);
        // Filter out validators that should be ignored or not run incrementally
        if (onlyIncrementalValidators == true)
        {
            validators = validators.Where(v => !v.NoIncrementalValidation);
        }
        else if (onlyIncrementalValidators == false)
        {
            validators = validators.Where(v => v.NoIncrementalValidation);
        }

        // Remove ignored validators
        if (ignoredValidators is not null)
            validators = validators.Where(v =>
                !ignoredValidators.Contains(v.ValidationSource, StringComparer.OrdinalIgnoreCase)
            );

        var cleanAccessor = dataAccessor;
        validators = validators.ToArray();
        // Initialize the clean accessor if any validator requires it
        // or skip initialization if all validators can run with the complete data
        if (validators.Any(c => c.ShouldRunAfterRemovingHiddenData))
        {
            cleanAccessor = dataAccessor.GetCleanAccessor();
        }

        // Start the validation tasks (but don't await yet, so that they can run in parallel)
        var validationTasks = validators.Select(async v =>
        {
            using var validatorActivity = _telemetry?.StartRunValidatorActivity(v);
            try
            {
                var accessor = v.ShouldRunAfterRemovingHiddenData ? cleanAccessor : dataAccessor;
                var issues = await v.Validate(accessor, taskId, language);
                validatorActivity?.SetTag(Telemetry.InternalLabels.ValidatorIssueCount, issues.Count);
                await TranslateValidationIssues(issues, language);
                return KeyValuePair.Create(
                    v.ValidationSource,
                    issues.Select(issue =>
                        ValidationIssueWithSource.FromIssue(issue, v.ValidationSource, v.NoIncrementalValidation)
                    )
                );
            }
            catch (Exception e)
            {
                _logger.LogError(
                    e,
                    "Error while running validator {ValidatorName} for task {TaskId} on instance {InstanceId}",
                    v.ValidationSource,
                    taskId,
                    dataAccessor.Instance.Id
                );
                validatorActivity?.Errored(e);
                throw;
            }
        });

        // Wait for all validation tasks to complete
        var lists = await Task.WhenAll(validationTasks);

        // Flatten the list of lists to a single list of issues
        var issues = lists.SelectMany(x => x.Value).ToList();
        activity?.SetTag(Telemetry.InternalLabels.ValidationTotalIssueCount, issues.Count);
        return issues;
    }

    /// <inheritdoc/>
    public async Task<List<ValidationSourcePair>> ValidateIncrementalFormData(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes,
        List<string>? ignoredValidators,
        string? language
    )
    {
        ArgumentNullException.ThrowIfNull(dataAccessor.Instance);
        ArgumentNullException.ThrowIfNull(taskId);
        ArgumentNullException.ThrowIfNull(changes);

        using var activity = _telemetry?.StartValidateIncrementalActivity(taskId, changes);

        var validators = _validatorFactory
            .GetValidators(taskId)
            .Where(v =>
                !v.NoIncrementalValidation
                && !(ignoredValidators?.Contains(v.ValidationSource, StringComparer.OrdinalIgnoreCase) ?? false)
            )
            .ToArray();

        DataElementChanges cleanChanges = changes;
        IInstanceDataAccessor cleanAccessor = dataAccessor;
        if (validators.Any(p => p.ShouldRunAfterRemovingHiddenData))
        {
            // Run validations on clean
            cleanAccessor = dataAccessor.GetCleanAccessor();
            var previousCleanAccessor = dataAccessor.GetPreviousDataAccessor().GetCleanAccessor();

            cleanChanges = await CleanFormDataChanges(changes, previousCleanAccessor, cleanAccessor);
        }

        // Start the validation tasks (but don't await yet, so that they can run in parallel)
        var validationTasks = validators.Select(async validator =>
        {
            using var validatorActivity = _telemetry?.StartRunValidatorActivity(validator);
            try
            {
                var localAccessor = validator.ShouldRunAfterRemovingHiddenData ? cleanAccessor : dataAccessor;
                var localChanges = validator.ShouldRunAfterRemovingHiddenData ? cleanChanges : changes;
                var hasRelevantChanges = await validator.HasRelevantChanges(localAccessor, taskId, localChanges);
                validatorActivity?.SetTag(Telemetry.InternalLabels.ValidatorHasRelevantChanges, hasRelevantChanges);
                if (hasRelevantChanges)
                {
                    var issues = await validator.Validate(localAccessor, taskId, language);
                    validatorActivity?.SetTag(Telemetry.InternalLabels.ValidatorIssueCount, issues.Count);
                    await TranslateValidationIssues(issues, language);
                    var issuesWithSource = issues
                        .Select(i =>
                            ValidationIssueWithSource.FromIssue(
                                i,
                                validator.ValidationSource,
                                validator.NoIncrementalValidation
                            )
                        )
                        .ToList();
                    return new ValidationSourcePair(validator.ValidationSource, issuesWithSource);
                }

                return null;
            }
            catch (Exception e)
            {
                _logger.LogError(
                    e,
                    "Error while running validator {validatorName} on task {taskId} in instance {instanceId}",
                    validator.GetType().Name,
                    taskId,
                    dataAccessor.Instance.Id
                );
                validatorActivity?.Errored(e);
                throw;
            }
        });

        // Wait for all validation tasks to complete

        var lists = await Task.WhenAll(validationTasks);

        var errorCount = lists.Sum(k => k?.Issues.Count ?? 0);
        activity?.SetTag(Telemetry.InternalLabels.ValidationTotalIssueCount, errorCount);
        return lists.OfType<ValidationSourcePair>().ToList();
    }

    private static async Task<DataElementChanges> CleanFormDataChanges(
        DataElementChanges changes,
        IInstanceDataAccessor previousAccessor,
        IInstanceDataAccessor cleanAccessor
    )
    {
        var cleanedChangeList = new List<DataElementChange>();

        foreach (var change in changes.AllChanges)
        {
            // Clean FormDataChange updates but keep other changes as is
            if (change is FormDataChange { DataElement: not null } fdc)
            {
                cleanedChangeList.Add(
                    new FormDataChange(
                        contentType: fdc.ContentType,
                        dataElement: fdc.DataElement,
                        dataType: fdc.DataType,
                        type: fdc.Type,
                        previousFormDataWrapper: await previousAccessor.GetFormDataWrapper(fdc.DataElementIdentifier),
                        currentFormDataWrapper: await cleanAccessor.GetFormDataWrapper(fdc.DataElementIdentifier),
                        // The binary data is kept as is, because logic is assumed to not use it
                        currentBinaryData: fdc.CurrentBinaryData,
                        previousBinaryData: fdc.PreviousBinaryData
                    )
                );
            }
            else
            {
                cleanedChangeList.Add(change);
            }
        }

        return new DataElementChanges(cleanedChangeList);
    }

    private async Task TranslateValidationIssues(IEnumerable<ValidationIssue> issues, string? language)
    {
        foreach (var issue in issues)
        {
            if (string.IsNullOrEmpty(issue.Description) && !string.IsNullOrEmpty(issue.CustomTextKey))
            {
                var translated = await _translationService.TranslateTextKey(
                    issue.CustomTextKey,
                    language,
                    issue.CustomTextParameters
                );
                if (translated is not null)
                {
                    issue.Description = translated;
                }
            }
        }
    }
}
