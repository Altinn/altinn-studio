#nullable disable
namespace Altinn.Studio.Designer.Helpers;

public static class CodeListUtils
{
    public static string FilePath(string codeListId) => $"CodeLists/{codeListId}.json";
    public static string FilePathWithTextResources(string codeListId) => $"CodeListsWithTextResources/{codeListId}.json";
}
