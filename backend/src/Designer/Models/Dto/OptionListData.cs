using System.Collections.Generic;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class OptionListData
{
    public string Title;
    [CanBeNull] public List<Option> Data;
    public bool? HasError;
}
