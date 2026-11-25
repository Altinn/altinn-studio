using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Models;

namespace Altinn.App.logic.Validation;

/// <summary>
/// Lets the validation showcase switch component, row-object and whole-array messages independently.
/// </summary>
internal sealed class RepeatingGroupShowcaseValidator : IValidator
{
    /// <summary>Starts the unique ID of each example pet, so the validator leaves ordinary pets alone.</summary>
    internal const string ExampleIdPrefix = "validation-showcase-";

    /// <summary>Checkbox value that turns on messages for the whole pet list.</summary>
    internal const string GroupMessages = "groups";

    /// <summary>Checkbox value that turns on messages for each pet row object.</summary>
    internal const string RowMessages = "rows";

    /// <summary>Checkbox value that turns on messages for fields in each pet row.</summary>
    internal const string FieldMessages = "fields";

    private const string DataType = "nested-group";

    private static readonly string[] Variants = ["default", "mixed", "table"];

    private static readonly ValidationIssueSeverity[] Severities =
    [
        ValidationIssueSeverity.Error,
        ValidationIssueSeverity.Warning,
        ValidationIssueSeverity.Informational,
        ValidationIssueSeverity.Success,
    ];

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
        if (pets?.Any(pet => pet.UniqueId?.StartsWith(ExampleIdPrefix, StringComparison.Ordinal) == true) != true)
        {
            return [];
        }
        // The controls are hidden until example rows are loaded, so they cannot clear the sender name in other tests.
        var selected = (model?.Endringsmeldinggrp9786?.Avgivergrp9787?.OppgavegiverNavndatadef68?.value ?? "")
            .Split(',').ToHashSet();
        var dataElementId = dataAccessor.GetDataElementsForType(DataType).Single().Id;

        List<ValidationIssue> issues = selected.Contains(GroupMessages) ? [.. GetGroupIssues(dataElementId)] : [];
        for (var rowIndex = 0; rowIndex < pets.Count; rowIndex++)
        {
            issues.AddRange(GetRowIssues(dataElementId, rowIndex, pets[rowIndex].UniqueId, selected));
        }

        return issues;
    }

    private static IEnumerable<ValidationIssue> GetGroupIssues(string dataElementId) =>
        Severities.Select(severity => new ValidationIssue
        {
            DataElementId = dataElementId,
            Field = nameof(NestedGroup.Pets),
            Severity = severity,
            Description = severity switch
            {
                ValidationIssueSeverity.Success => "Kjæledyrene i denne gruppen er kontrollert samlet.",
                ValidationIssueSeverity.Informational => "Denne meldingen gjelder hele listen med kjæledyr.",
                _ => "Kontroller kjæledyrene i denne gruppen samlet.",
            },
        });

    private static IEnumerable<ValidationIssue> GetRowIssues(
        string dataElementId,
        int rowIndex,
        string? petId,
        HashSet<string> selected
    )
    {
        var messages = GetFieldMessages(petId);
        if (selected.Contains(RowMessages) && messages.Length > 0)
        {
            yield return new ValidationIssue
            {
                DataElementId = dataElementId,
                Field = $"{nameof(NestedGroup.Pets)}[{rowIndex}]",
                Severity = messages[0].Severity,
                Description = "Denne meldingen gjelder opplysningene om kjæledyret samlet.",
            };
        }

        if (!selected.Contains(FieldMessages))
        {
            yield break;
        }

        foreach (var variant in Variants)
        {
            foreach (var message in messages)
            {
                yield return new ValidationIssue
                {
                    DataElementId = dataElementId,
                    ComponentId = $"validation-{variant}-{message.Field}",
                    RowIndexes = [rowIndex],
                    Severity = message.Severity,
                    Description = message.Description,
                };
            }
        }
    }

    // Stable example identities keep each case intact when rows are edited, deleted or reordered.
    private static (string Field, ValidationIssueSeverity Severity, string Description)[] GetFieldMessages(string? id) =>
        id?.StartsWith(ExampleIdPrefix, StringComparison.Ordinal) == true ? GetExampleMessages(id[ExampleIdPrefix.Length..]) : [];

    private static (string Field, ValidationIssueSeverity Severity, string Description)[] GetExampleMessages(string example) => example switch
    {
        "balder" => [("name", ValidationIssueSeverity.Error, "Navnet stemmer ikke med opplysningene i registeret.")],
        "maja" => [("species", ValidationIssueSeverity.Warning, "Dyreslaget er endret siden forrige innrapportering. Kontroller at katt er riktig.")],
        "luna" => [("age", ValidationIssueSeverity.Informational, "Alderen er hentet fra registeret.")],
        "felix" => [("age", ValidationIssueSeverity.Success, "Alderen er kontrollert.")],
        "milo" => [
            ("name", ValidationIssueSeverity.Error, "Oppgi navnet slik det står i registeret."),
            ("age", ValidationIssueSeverity.Warning, "Alderen er høyere enn ved forrige innrapportering. Kontroller verdien.")
        ],
        "nala" => [
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
