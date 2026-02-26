#nullable disable
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Mappers;

public static class LayoutSetMapper
{
    public static LayoutSetDto ToDto(this LayoutSetModel layoutSet)
    {
        return new LayoutSetDto()
        {
            Id = layoutSet.Id,
            DataType = layoutSet.DataType,
            Type = layoutSet.Type,
            Task = layoutSet.Task,
        };
    }
}
