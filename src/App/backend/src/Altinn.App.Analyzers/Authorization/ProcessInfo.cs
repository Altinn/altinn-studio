using System.Xml;
using System.Xml.Linq;

namespace Altinn.App.Analyzers.Authorization;

/// <summary>
/// The end events of <c>config/process/process.bpmn</c>, which a <c>complete</c> grant may be scoped to -
/// deliberately only that, not a model of the process. Mirrors the record of the same name in the v8-to-v9
/// policy migrator, which reads the end events for the same purpose.
/// </summary>
internal sealed class ProcessInfo
{
    /// <summary>
    /// The namespace the app runtime itself requires when it reads a process (<c>Process.cs</c> in
    /// Altinn.App.Core binds to exactly this). Matching on local names alone would let an unrelated
    /// <c>foo:endEvent</c> from some vendor extension count as an end event the process never reaches.
    /// </summary>
    private static readonly XNamespace _bpmn = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    private ProcessInfo(HashSet<string> endEventIds)
    {
        EndEventIds = endEventIds;
    }

    /// <summary>End event ids, used to accept <c>complete</c> grants scoped to a real end event.</summary>
    internal HashSet<string> EndEventIds { get; }

    /// <summary>Parses the process, or returns null when the document is not valid XML.</summary>
    internal static ProcessInfo? TryParse(string xml)
    {
        XDocument document;
        try
        {
            document = XDocument.Parse(xml);
        }
        catch (XmlException)
        {
            return null;
        }

        if (document.Root is null)
        {
            return null;
        }

        var endEventIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var endEvent in document.Descendants(_bpmn + "endEvent"))
        {
            if (endEvent.Attribute("id")?.Value is { Length: > 0 } id)
            {
                endEventIds.Add(id);
            }
        }

        return new ProcessInfo(endEventIds);
    }
}
