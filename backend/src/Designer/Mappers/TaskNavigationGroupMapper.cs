using System;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Mappers;

public static class TaskNavigationGroupMapper
{
    public static TaskNavigationGroupDto ToDto(this TaskNavigationGroup taskNavigationGroup, Func<string, string> resolveTaskType)
    {
        return taskNavigationGroup switch
        {
            TaskNavigationTask task => new()
            {
                TaskId = task.TaskId,
                TaskType = resolveTaskType(task.TaskId),
                Name = task.Name,
            },
            TaskNavigationReceipt receipt => new()
            {
                TaskType = receipt.Type.GetJsonStringEnumMemberName(),
                Name = receipt.Name,
            },
            _ => new()
            {
                Name = taskNavigationGroup.Name,
            }
        };
    }
}
