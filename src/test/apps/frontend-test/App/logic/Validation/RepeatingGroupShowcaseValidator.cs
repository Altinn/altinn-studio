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
        if (pets?.Any(pet => pet.UniqueId?.StartsWith("validation-showcase-", StringComparison.Ordinal) == true) != true)
        {
            return [];
        }
        // The controls are hidden until example rows are loaded, so they cannot clear the sender name in other tests.
        var selected = (model?.Endringsmeldinggrp9786?.Avgivergrp9787?.OppgavegiverNavndatadef68?.value ?? "")
            .Split(',').ToHashSet();
        var issues = new List<ValidationIssue>();
        var dataElement = dataAccessor.GetDataElementsForType("nested-group").Single();
        foreach (var variant in Variants)
        {
            var componentId = $"validation-{variant}";
            if (selected.Contains("groups"))
            {
                foreach (var severity in new[]
                {
                    ValidationIssueSeverity.Error, ValidationIssueSeverity.Warning,
                    ValidationIssueSeverity.Informational, ValidationIssueSeverity.Success,
                })
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
                var messages = GetFieldMessages(pets[rowIndex].UniqueId);
                if (selected.Contains("rows") && messages.Length > 0)
                {
                    issues.Add(new ValidationIssue
                    {
                        DataElementId = dataElement.Id,
                        ComponentId = $"{componentId}-row",
                        RowIndexes = [rowIndex],
                        Severity = messages[0].Severity,
                        Description = "Denne meldingen gjelder opplysningene om kjæledyret samlet.",
                    });
                }

                if (selected.Contains("fields"))
                {
                    foreach (var message in messages)
                    {
                        issues.Add(new ValidationIssue
                        {
                            DataElementId = dataElement.Id,
                            ComponentId = $"{componentId}-{message.Field}",
                            RowIndexes = [rowIndex],
                            Severity = message.Severity,
                            Description = message.Description,
                        });
                    }
                }
            }
        }

        return issues;
    }

    // Stable example identities keep each case intact when rows are edited, deleted or reordered.
    private static (string Field, ValidationIssueSeverity Severity, string Description)[] GetFieldMessages(string? id) => id switch
    {
        "validation-showcase-balder" => [("name", ValidationIssueSeverity.Error, "Navnet stemmer ikke med opplysningene i registeret.")],
        "validation-showcase-maja" => [("species", ValidationIssueSeverity.Warning, "Dyreslaget er endret siden forrige innrapportering. Kontroller at katt er riktig.")],
        "validation-showcase-luna" => [("age", ValidationIssueSeverity.Informational, "Alderen er hentet fra registeret.")],
        "validation-showcase-felix" => [("age", ValidationIssueSeverity.Success, "Alderen er kontrollert.")],
        "validation-showcase-milo" => [
            ("name", ValidationIssueSeverity.Error, "Oppgi navnet slik det står i registeret."),
            ("age", ValidationIssueSeverity.Warning, "Alderen er høyere enn ved forrige innrapportering. Kontroller verdien.")
        ],
        "validation-showcase-nala" => [
            ("name", ValidationIssueSeverity.Error, "Navnet mangler i registeret."),
            ("name", ValidationIssueSeverity.Error, "Kontroller at navnet er skrevet riktig.")
        ],
        _ => [],
    };

    /// <inheritdoc />
    public Task<bool> HasRelevantChanges(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes
    ) => Task.FromResult(true);
}
