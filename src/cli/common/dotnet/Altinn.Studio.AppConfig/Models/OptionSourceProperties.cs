namespace Altinn.Studio.AppConfig.Models;

internal static class OptionSourceProperties
{
    private static readonly string[] _optionList = ["optionsId", "options", "source"];
    private static readonly string[] _dataList = ["dataListId"];

    public static IReadOnlyList<string> For(string componentType) => componentType == "List" ? _dataList : _optionList;
}
