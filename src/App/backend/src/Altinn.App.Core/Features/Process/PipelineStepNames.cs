using System.Text.RegularExpressions;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Resolves what a pipeline item is called for display: the name the app passed, or else the name of the
/// method the app passed as the item's work, written out as words.
/// </summary>
internal static partial class PipelineStepNames
{
    /// <summary>
    /// The longest name an app may give a pipeline item.
    /// </summary>
    internal const int MaxNameLength = 100;

    /// <summary>
    /// The display name for an item composed with <paramref name="name"/> and <paramref name="work"/>.
    /// </summary>
    /// <exception cref="ArgumentException"><paramref name="name"/> is blank or too long.</exception>
    internal static string? Resolve(string? name, Delegate work, string parameterName)
    {
        if (name is not null)
        {
            // Checked as displayed: the limit is on the trimmed name.
            string trimmed = name.Trim();
            if (trimmed.Length == 0)
            {
                throw new ArgumentException("A pipeline item's name must not be blank.", parameterName);
            }
            if (trimmed.Length > MaxNameLength)
            {
                throw new ArgumentException(
                    $"A pipeline item's name must be at most {MaxNameLength} characters.",
                    parameterName
                );
            }
            return trimmed;
        }

        return FromMethod(work);
    }

    /// <summary>
    /// The name of the method behind <paramref name="work"/>, written out as words: <c>SendToArchive</c> reads
    /// "Send to archive". A local function keeps its own name. A lambda has only a name the compiler made up,
    /// and a simple <see cref="IServiceTask"/>'s conclusion is its <see cref="IServiceTask.Execute"/>, which
    /// says nothing, so neither gives one.
    /// </summary>
    private static string? FromMethod(Delegate work)
    {
        // An explicit interface implementation is named after its interface: IServiceTask.Execute.
        string methodName = work.Method.Name[(work.Method.Name.LastIndexOf('.') + 1)..];
        if (work.Target is IServiceTask && methodName == nameof(IServiceTask.Execute))
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
    /// The compiler's name for a local function: <c>&lt;Define&gt;g__SendIt|0_0</c>.
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
