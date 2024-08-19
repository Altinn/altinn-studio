using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Main validation service that encapsulates all validation logic
/// </summary>
public class ValidationService : IValidationService
{
    private readonly IValidatorFactory _validatorFactory;
    private readonly ILogger<ValidationService> _logger;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Constructor with DI services
    /// </summary>
    public ValidationService(
        IValidatorFactory validatorFactory,
        ILogger<ValidationService> logger,
        Telemetry? telemetry = null
    )
    {
        _validatorFactory = validatorFactory;
        _logger = logger;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<List<ValidationIssueWithSource>> ValidateInstanceAtTask(
        Instance instance,
        string taskId,
        IInstanceDataAccessor dataAccessor,
        string? language
    )
    {
        ArgumentNullException.ThrowIfNull(instance);
        ArgumentNullException.ThrowIfNull(taskId);

        using var activity = _telemetry?.StartValidateInstanceAtTaskActivity(instance, taskId);

        // Run task validations (but don't await yet)
        var validators = _validatorFactory.GetValidators(taskId);
        var validationTasks = validators.Select(async v =>
        {
            using var validatorActivity = _telemetry?.StartRunValidatorActivity(v);
            try
            {
                var issues = await v.Validate(instance, dataAccessor, taskId, language);
                return KeyValuePair.Create(
                    v.ValidationSource,
                    issues.Select(issue => ValidationIssueWithSource.FromIssue(issue, v.ValidationSource))
                );
            }
            catch (Exception e)
            {
                _logger.LogError(
                    e,
                    "Error while running validator {ValidatorName} for task {TaskId} on instance {InstanceId}",
                    v.ValidationSource,
                    taskId,
                    instance.Id
                );
                validatorActivity?.Errored(e);
                throw;
            }
        });
        var lists = await Task.WhenAll(validationTasks);

        // Flatten the list of lists to a single list of issues
        return lists.SelectMany(x => x.Value).ToList();
    }

    /// <inheritdoc/>
    public async Task<Dictionary<string, List<ValidationIssueWithSource>>> ValidateIncrementalFormData(
        Instance instance,
        string taskId,
        List<DataElementChange> changes,
        IInstanceDataAccessor dataAccessor,
        List<string>? ignoredValidators,
        string? language
    )
    {
        ArgumentNullException.ThrowIfNull(instance);
        ArgumentNullException.ThrowIfNull(taskId);
        ArgumentNullException.ThrowIfNull(changes);

        using var activity = _telemetry?.StartValidateIncrementalActivity(instance, taskId, changes);

        var validators = _validatorFactory
            .GetValidators(taskId)
            .Where(v => !(ignoredValidators?.Contains(v.ValidationSource) ?? false))
            .ToArray();

        ThrowIfDuplicateValidators(validators, taskId);

        // Run task validations (but don't await yet)
        var validationTasks = validators.Select(async validator =>
        {
            using var validatorActivity = _telemetry?.StartRunValidatorActivity(validator);
            try
            {
                var hasRelevantChanges = await validator.HasRelevantChanges(instance, taskId, changes, dataAccessor);
                validatorActivity?.SetTag(Telemetry.InternalLabels.ValidatorRelevantChanges, hasRelevantChanges);
                if (hasRelevantChanges)
                {
                    var issues = await validator.Validate(instance, dataAccessor, taskId, language);
                    var issuesWithSource = issues
                        .Select(i => ValidationIssueWithSource.FromIssue(i, validator.ValidationSource))
                        .ToList();
                    return new KeyValuePair<string, List<ValidationIssueWithSource>?>(
                        validator.ValidationSource,
                        issuesWithSource
                    );
                }

                return new KeyValuePair<string, List<ValidationIssueWithSource>?>();
            }
            catch (Exception e)
            {
                _logger.LogError(
                    e,
                    "Error while running validator {validatorName} on task {taskId} in instance {instanceId}",
                    validator.GetType().Name,
                    taskId,
                    instance.Id
                );
                validatorActivity?.Errored(e);
                throw;
            }
        });

        var lists = await Task.WhenAll(validationTasks);

        // ! Value is null if no relevant changes. Filter out these before return with ! because ofType don't filter nullables.
        return lists.Where(k => k.Value is not null).ToDictionary(kv => kv.Key, kv => kv.Value!);
    }

    private static void ThrowIfDuplicateValidators(IValidator[] validators, string taskId)
    {
        var sourceNames = validators
            .Select(v => v.ValidationSource)
            .Distinct(StringComparer.InvariantCultureIgnoreCase);
        if (sourceNames.Count() != validators.Length)
        {
            var sources = string.Join('\n', validators.Select(v => $"{v.ValidationSource} {v.GetType().FullName}"));
            throw new InvalidOperationException(
                $"Duplicate validators found for task {taskId}. Ensure that each validator has a unique ValidationSource.\n\n{sources}"
            );
        }
    }
}
