using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Models;

namespace Altinn.App.logic.Validation;

/// <summary>
/// Lets the validation showcase switch component, row-container and whole-group messages independently.
/// </summary>
internal sealed class RepeatingGroupShowcaseValidator : IValidator
{
    private static readonly string[] Variants = ["default", "mixed", "table"];
    private static readonly string[] Fields = ["name", "species", "age"];

    /// <inheritdoc />
    public string TaskId => "Task_3";

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    )
    {
        var model = await dataAccessor.GetFormData<NestedGroup>();
        var pets = model?.Pets;
        if (pets?.FirstOrDefault()?.UniqueId != "validation-showcase-balder")
        {
            return [];
        }
        // The controls are hidden until example rows are loaded, so they cannot clear the sender name in other tests.
        var selected = (model?.Endringsmeldinggrp9786?.Avgivergrp9787?.OppgavegiverNavndatadef68?.value ?? "")
            .Split(',').ToHashSet();
        var severities = new (string Key, ValidationIssueSeverity Severity)[]
        {
            ("error", ValidationIssueSeverity.Error),
            ("warning", ValidationIssueSeverity.Warning),
            ("info", ValidationIssueSeverity.Informational),
            ("success", ValidationIssueSeverity.Success),
        }.Where(item => selected.Contains(item.Key)).Select(item => item.Severity).ToArray();
        var issues = new List<ValidationIssue>();
        if (severities.Length == 0)
        {
            return issues;
        }

        var dataElement = dataAccessor.GetDataElementsForType("nested-group").Single();
        foreach (var variant in Variants)
        {
            var componentId = $"validation-{variant}";
            if (selected.Contains("groups"))
            {
                foreach (var severity in severities)
                {
                    issues.Add(new ValidationIssue
                    {
                        DataElementId = dataElement.Id,
                        ComponentId = componentId,
                        Severity = severity,
                        Description = severity switch
                        {
                            ValidationIssueSeverity.Success => "Kjæledyrene i denne gruppen er kontrollert samlet.",
                            ValidationIssueSeverity.Informational => "Denne meldingen gjelder hele listen med kjæledyr.",
                            _ => "Kontroller kjæledyrene i denne gruppen samlet.",
                        },
                    });
                }
            }

            for (var rowIndex = 0; rowIndex < pets.Count; rowIndex++)
            {
                // Distribute selected severities across rows, retaining every selection even with fewer rows.
                var rowSeverities = severities.Length <= pets.Count
                    ? [severities[rowIndex % severities.Length]]
                    : severities.Where((_, index) => index % pets.Count == rowIndex).ToArray();
                foreach (var severity in rowSeverities)
                {
                    if (selected.Contains("rows"))
                    {
                        issues.Add(new ValidationIssue
                        {
                            DataElementId = dataElement.Id,
                            ComponentId = $"{componentId}-row",
                            RowIndexes = [rowIndex],
                            Severity = severity,
                            Description = severity switch
                            {
                                ValidationIssueSeverity.Success => "Opplysningene om dette kjæledyret er kontrollert samlet.",
                                ValidationIssueSeverity.Informational => "Denne meldingen gjelder alle opplysningene om kjæledyret.",
                                _ => "Kontroller opplysningene om dette kjæledyret samlet.",
                            },
                        });
                    }

                    if (selected.Contains("fields"))
                    {
                        foreach (var field in Fields)
                        {
                            issues.Add(new ValidationIssue
                            {
                                DataElementId = dataElement.Id,
                                ComponentId = $"{componentId}-{field}",
                                RowIndexes = [rowIndex],
                                Severity = severity,
                                Description = severity switch
                                {
                                    ValidationIssueSeverity.Error => "Verdien må korrigeres.",
                                    ValidationIssueSeverity.Warning => "Kontroller at verdien stemmer.",
                                    ValidationIssueSeverity.Informational => "Verdien er hentet fra eksempeldata.",
                                    _ => "Verdien er kontrollert.",
                                },
                            });
                        }
                    }
                }
            }
        }

        return issues;
    }

    /// <inheritdoc />
    public Task<bool> HasRelevantChanges(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes
    ) => Task.FromResult(true);
}
