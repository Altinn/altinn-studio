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
                TaskType = receipt.Type.ToStringValue(),
                Name = receipt.Name,
            },
            _ => throw new ArgumentException($"Unknown TaskNavigationGroup type for '{taskNavigationGroup.Name}': {taskNavigationGroup.GetType().Name}")
        };
    }

    public static TaskNavigationGroup ToDomain(this TaskNavigationGroupDto taskNavigationGroupDto)
    {
        if (!string.IsNullOrEmpty(taskNavigationGroupDto.TaskId))
        {
            return new TaskNavigationTask
            {
                TaskId = taskNavigationGroupDto.TaskId,
                Name = taskNavigationGroupDto.Name,
            };
        }

        if (!string.IsNullOrEmpty(taskNavigationGroupDto.TaskType))
        {
            return new TaskNavigationReceipt
            {
                Type = taskNavigationGroupDto.TaskType.ToEnumValue<TaskNavigationReceiptType>(),
                Name = taskNavigationGroupDto.Name,
            };
        }

        throw new ArgumentException($"Unknown TaskNavigationGroup type for '{taskNavigationGroupDto.Name}': {taskNavigationGroupDto.GetType().Name}");
    }
}
