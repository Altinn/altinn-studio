using System.Text.RegularExpressions;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What a pipeline item is called where people follow a task's progress, such as Studio's admin panel: the name of
/// the method the app passed as the item's work, written out as words. Display only: an item's identity is its
/// index, and its name changes nothing about how it runs.
/// </summary>
internal static partial class PipelineStepNames
{
    /// <summary>
    /// The name of the method behind <paramref name="work"/>, written out as words: <c>SendToArchive</c> reads
    /// "Send to archive". A local function keeps its own name. A lambda has only a name the compiler made up, and a
    /// service task's own <c>Execute</c> says nothing the task type does not, so neither gives one.
    /// </summary>
    internal static string? FromMethod(Delegate work)
    {
        // An explicit interface implementation is named after its interface: ISomething.Execute.
        string methodName = work.Method.Name[(work.Method.Name.LastIndexOf('.') + 1)..];
        if (work.Target is IServiceTask && methodName == "Execute")
        {
            return null;
        }

        if (methodName.Contains('<', StringComparison.Ordinal))
        {
            Match localFunction = LocalFunctionName().Match(methodName);
            return localFunction.Success ? Words(localFunction.Groups["name"].Value) : null;
        }

        return Words(methodName);
    }

    /// <summary>
    /// A PascalCase or camelCase identifier as a phrase: the first word as written, the rest in lower case,
    /// except an acronym, which keeps its capitals (<c>GeneratePDFReceipt</c> reads "Generate PDF receipt").
    /// </summary>
    private static string Words(string identifier)
    {
        string[] words = WordBoundary().Split(identifier).Where(word => word.Length > 0).ToArray();
        if (words.Length == 0)
        {
            return identifier;
        }

        IEnumerable<string> rest = words
            .Skip(1)
            .Select(word => word.Length > 1 && word.All(char.IsUpper) ? word : word.ToLowerInvariant());
        return string.Join(' ', [char.ToUpperInvariant(words[0][0]) + words[0][1..], .. rest]);
    }

    /// <summary>
    /// The compiler's name for a local function: <c>&lt;DefineExecute&gt;g__SendIt|0_0</c>.
    /// </summary>
    [GeneratedRegex(@"g__(?<name>[^|]+)\|")]
    private static partial Regex LocalFunctionName();

    /// <summary>
    /// Between a lower-case letter or digit and an upper-case one, and before the last capital of an acronym
    /// followed by a lower-case letter, so <c>PDFReceipt</c> splits as <c>PDF</c>, <c>Receipt</c>. Any letter
    /// counts, not only ASCII, so <c>SendTilÅrsmøte</c> splits before <c>Å</c>.
    /// </summary>
    [GeneratedRegex(@"(?<=[\p{Ll}\d])(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})|_+")]
    private static partial Regex WordBoundary();
}
