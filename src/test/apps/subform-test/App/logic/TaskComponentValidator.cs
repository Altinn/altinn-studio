using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using MainModel = Altinn.App.Models.model.model;

namespace Altinn.App.logic;

public class TaskComponentValidator : IValidator
{
    public string TaskId => "Task_1";

    public async Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    )
    {
        var model = await dataAccessor.GetFormData<MainModel>();
        var componentId = model?.Navn switch
        {
            "task-component-error" => "Input-Name",
            "task-unbound-error" => "missing-component",
            _ => null,
        };

        // IValidator has no implicit data element scope. These issues deliberately omit DataElementId and Field.
        return componentId is null
            ? []
            :
            [
                new ValidationIssue
                {
                    ComponentId = componentId,
                    Description = "Task-wide component error",
                    Severity = ValidationIssueSeverity.Error,
                },
            ];
    }

    public Task<bool> HasRelevantChanges(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes
    ) => Task.FromResult(true);
}
