using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Models;

namespace Altinn.App.logic.Validation;

/// <summary>
/// Produces issues linked to a specific component (and repeating group row) instead of only to a field, so the
/// frontend tests can check that they are shown beside that component.
/// </summary>
public class ComponentLinkedValidator : IValidator
{
    public string TaskId => "*";

    public bool ShouldRunForTask(string taskId) => taskId is "Task_2" or "Task_3";

    public Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    ) => taskId == "Task_2" ? ValidateChangeName(dataAccessor) : ValidateNestedGroup(dataAccessor);

    private static async Task<List<ValidationIssue>> ValidateChangeName(
        IInstanceDataAccessor dataAccessor
    )
    {
        var validationIssues = new List<ValidationIssue>();

        var dataElement = dataAccessor.GetDataElementsForType("ServiceModel-test").First();
        var changeName = await dataAccessor.GetFormData<Skjema>(dataElement);
        string? middleName = changeName
            .NyttNavngrp9313
            ?.NyttNavngrp9314
            ?.PersonMellomnavnNyttdatadef34759
            ?.value;
        if (middleName?.Contains("lenket") == true)
        {
            // Bound to the middle name, but shown beside the first name
            validationIssues.Add(
                new ValidationIssue
                {
                    DataElementId = dataElement.Id,
                    Field =
                        "NyttNavn-grp-9313.NyttNavn-grp-9314.PersonMellomnavnNytt-datadef-34759.value",
                    ComponentId = "newFirstName",
                    Description = "Mellomnavnet er lenket til fornavnet",
                    Severity = ValidationIssueSeverity.Error,
                }
            );
        }

        return validationIssues;
    }

    private static async Task<List<ValidationIssue>> ValidateNestedGroup(
        IInstanceDataAccessor dataAccessor
    )
    {
        var validationIssues = new List<ValidationIssue>();

        var nestedGroup = await dataAccessor.GetFormData<NestedGroup>();
        var rows = nestedGroup?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788 ?? [];
        for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
        {
            var nestedRows = rows[rowIndex].nestedgrp1234 ?? [];
            for (var nestedRowIndex = 0; nestedRowIndex < nestedRows.Count; nestedRowIndex++)
            {
                string? comment = nestedRows[nestedRowIndex]
                    .SkattemeldingEndringEtterFristKommentardatadef37133
                    ?.value;
                if (comment?.Contains("lenket") == true)
                {
                    // No field, only a component in a nested repeating group row
                    validationIssues.Add(
                        new ValidationIssue
                        {
                            ComponentId = "hideComment",
                            RowIndexes = [rowIndex, nestedRowIndex],
                            Description = "Kommentaren er lenket til raden",
                            Severity = ValidationIssueSeverity.Error,
                        }
                    );
                }
            }
        }

        return validationIssues;
    }

    public Task<bool> HasRelevantChanges(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes
    ) => Task.FromResult(true);
}
