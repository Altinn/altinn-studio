using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Designer.Services.Implementation.ProcessModeling;

internal static class ProcessDefinitionXml
{
    private static readonly XNamespace s_bpmn = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    internal static readonly XNamespace AltinnNamespace = "http://altinn.no/process";
    private static readonly UTF8Encoding s_utf8WithoutBom = new(encoderShouldEmitUTF8Identifier: false);

    internal static XDocument Parse(string xml)
    {
        if (Encoding.UTF8.GetByteCount(xml) > 1_000_000)
        {
            throw new ArgumentException("The BPMN file is too large.");
        }
        try
        {
            using var reader = XmlReader.Create(
                new StringReader(xml),
                new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit }
            );
            XDocument document = XDocument.Load(reader, LoadOptions.PreserveWhitespace);
            if (
                document.Root?.Name != s_bpmn + "definitions"
                || document.Root.Elements(s_bpmn + "process").Count() != 1
            )
            {
                throw new ArgumentException("The BPMN file must contain one process.");
            }
            return document;
        }
        catch (XmlException exception)
        {
            throw new ArgumentException("The BPMN file is not valid XML.", exception);
        }
    }

    internal static IEnumerable<XElement> Tasks(XDocument document) =>
        document
            .Descendants()
            .Where(element => element.Name == s_bpmn + "task" || element.Name == s_bpmn + "serviceTask");

    // Preserve the declaration and parsed whitespace; markup is normalized and emitted as UTF-8 without a BOM.
    internal static byte[] Serialize(XDocument document)
    {
        var settings = new XmlWriterSettings
        {
            Encoding = s_utf8WithoutBom,
            // Avoid platform-dependent line endings after the parser normalizes them to LF.
            NewLineChars = "\n",
            OmitXmlDeclaration = document.Declaration is null,
        };
        using var stream = new MemoryStream();
        using (XmlWriter writer = XmlWriter.Create(stream, settings))
        {
            if (document.Declaration is { } declaration)
            {
                // XmlWriter would otherwise change the declaration's encoding capitalization.
                writer.WriteProcessingInstruction("xml", GetDeclarationContent(declaration));
            }
            foreach (XNode node in document.Nodes())
            {
                node.WriteTo(writer);
            }
        }
        return stream.ToArray();
    }

    private static string GetDeclarationContent(XDeclaration declaration)
    {
        var content = new StringBuilder($"version=\"{declaration.Version}\"");
        if (declaration.Encoding is { } encoding)
        {
            bool declaresUtf8 = string.Equals(encoding, "utf-8", StringComparison.OrdinalIgnoreCase);
            content.Append($" encoding=\"{(declaresUtf8 ? encoding : "utf-8")}\"");
        }
        if (declaration.Standalone is { } standalone)
        {
            content.Append($" standalone=\"{standalone}\"");
        }
        return content.ToString();
    }
}
