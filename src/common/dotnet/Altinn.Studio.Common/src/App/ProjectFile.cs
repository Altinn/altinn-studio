using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Xml;

namespace Altinn.Studio.Common.App;

/// <summary>
/// The properties, package references and central package versions of an MSBuild file, such as a <c>.csproj</c> or
/// <c>Directory.Packages.props</c>.
/// </summary>
/// <remarks>
/// It reads the file as written rather than evaluating it as MSBuild does: it ignores conditions, imports and targets,
/// and the last definition of a property wins.
/// </remarks>
public sealed class ProjectFile
{
    private const int MaxExpansionDepth = 8;

    private static readonly XmlReaderSettings s_settings = new()
    {
        DtdProcessing = DtdProcessing.Ignore,
        XmlResolver = null,
        IgnoreComments = true,
        IgnoreProcessingInstructions = true,
        CloseInput = false,
    };

    private ProjectFile(
        Dictionary<string, string> properties,
        List<Item> packageReferences,
        Dictionary<string, string> packageVersions
    )
    {
        Properties = properties;
        PackageReferences = packageReferences;
        PackageVersions = packageVersions;
    }

    /// <summary>The properties the file sets, by name, ignoring case as MSBuild does.</summary>
    public IReadOnlyDictionary<string, string> Properties { get; }

    /// <summary>The <c>PackageReference</c> items the file includes, in order, as written.</summary>
    public IReadOnlyList<Item> PackageReferences { get; }

    /// <summary>The <c>PackageVersion</c> items of central package management, by package, as written.</summary>
    public IReadOnlyDictionary<string, string> PackageVersions { get; }

    /// <summary>A package item as written in the file, before properties are resolved.</summary>
    /// <param name="Name">The package ID from <c>Include</c>.</param>
    /// <param name="Version">The <c>Version</c> attribute or element.</param>
    /// <param name="VersionOverride">The <c>VersionOverride</c> attribute or element.</param>
    public sealed record Item(string Name, string? Version, string? VersionOverride);

    /// <summary>Parses a file's bytes, or returns <c>false</c> when it is not well-formed XML.</summary>
    public static bool TryParse(ReadOnlyMemory<byte> content, [NotNullWhen(true)] out ProjectFile? file)
    {
        using MemoryStream stream =
            MemoryMarshal.TryGetArray(content, out ArraySegment<byte> segment) && segment.Array is { } array
                ? new MemoryStream(array, segment.Offset, segment.Count, writable: false)
                : new MemoryStream(content.ToArray(), writable: false);
        return TryParse(stream, out file);
    }

    /// <summary>Parses a file from a stream, which it leaves open, or returns <c>false</c> when it is not XML.</summary>
    public static bool TryParse(Stream content, [NotNullWhen(true)] out ProjectFile? file)
    {
        try
        {
            using var reader = XmlReader.Create(content, s_settings);
            file = Parse(reader);
        }
        catch (XmlException)
        {
            file = null;
        }

        return file is not null;
    }

    /// <summary>Parses a file's text, or returns <c>false</c> when it is not well-formed XML.</summary>
    public static bool TryParse(string content, [NotNullWhen(true)] out ProjectFile? file)
    {
        try
        {
            using var text = new StringReader(content.TrimStart('\uFEFF'));
            using var reader = XmlReader.Create(text, s_settings);
            file = Parse(reader);
        }
        catch (XmlException)
        {
            file = null;
        }

        return file is not null;
    }

    private static ProjectFile Parse(XmlReader reader)
    {
        var properties = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var packageReferences = new List<Item>();
        var packageVersions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        string? group = null;
        while (reader.Read())
        {
            if (reader.NodeType != XmlNodeType.Element)
            {
                continue;
            }

            if (reader.Depth == 1)
            {
                group = reader.LocalName;
            }
            else if (reader.Depth == 2 && Is(group, "PropertyGroup"))
            {
                string name = reader.LocalName;
                properties[name] = ReadText(reader);
            }
            else if (reader.Depth == 2 && Is(group, "ItemGroup"))
            {
                ReadItem(reader, packageReferences, packageVersions);
            }
        }

        return new ProjectFile(properties, packageReferences, packageVersions);
    }

    /// <summary>
    /// Replaces each <c>$(Name)</c> in a value with the property's value, recursively. Returns <c>null</c> when a
    /// property is not set or the value calls a property function, since the result would then be unknown.
    /// </summary>
    public static string? ExpandProperties(string? value, IReadOnlyDictionary<string, string> properties) =>
        Expand(value, properties, depth: 0);

    private static string? Expand(string? value, IReadOnlyDictionary<string, string> properties, int depth)
    {
        if (value is null || depth > MaxExpansionDepth)
        {
            return null;
        }

        int start = value.IndexOf("$(", StringComparison.Ordinal);
        if (start < 0)
        {
            return value;
        }

        var result = new StringBuilder(value.Length);
        int position = 0;
        while (start >= 0)
        {
            int end = value.IndexOf(')', start);
            if (end < 0)
            {
                return null;
            }

            string name = value.Substring(start + 2, end - start - 2);
            if (!IsPropertyName(name) || !properties.TryGetValue(name, out string? propertyValue))
            {
                return null;
            }

            string? expanded = Expand(propertyValue, properties, depth + 1);
            if (expanded is null)
            {
                return null;
            }

            result.Append(value, position, start - position).Append(expanded);
            position = end + 1;
            start = value.IndexOf("$(", position, StringComparison.Ordinal);
        }

        return result.Append(value, position, value.Length - position).ToString();
    }

    private static bool IsPropertyName(string name)
    {
        if (name.Length == 0 || !(AsciiText.IsLetter(name[0]) || name[0] == '_'))
        {
            return false;
        }

        foreach (char c in name)
        {
            if (!AsciiText.IsLetterOrDigit(c) && c is not ('_' or '-'))
            {
                return false;
            }
        }

        return true;
    }

    private static void ReadItem(
        XmlReader reader,
        List<Item> packageReferences,
        Dictionary<string, string> packageVersions
    )
    {
        bool isReference = Is(reader.LocalName, "PackageReference");
        if (!isReference && !Is(reader.LocalName, "PackageVersion"))
        {
            return;
        }

        string? include = null;
        string? version = null;
        string? versionOverride = null;
        while (reader.MoveToNextAttribute())
        {
            if (Is(reader.LocalName, "Include"))
            {
                include = reader.Value.Trim();
            }
            else if (Is(reader.LocalName, "Version"))
            {
                version = reader.Value.Trim();
            }
            else if (Is(reader.LocalName, "VersionOverride"))
            {
                versionOverride = reader.Value.Trim();
            }
        }

        reader.MoveToElement();
        if (!reader.IsEmptyElement)
        {
            int depth = reader.Depth;
            reader.Read();
            while (!reader.EOF && !(reader.NodeType == XmlNodeType.EndElement && reader.Depth == depth))
            {
                if (reader.NodeType == XmlNodeType.Element && Is(reader.LocalName, "Version"))
                {
                    version = ReadText(reader);
                }
                else if (reader.NodeType == XmlNodeType.Element && Is(reader.LocalName, "VersionOverride"))
                {
                    versionOverride = ReadText(reader);
                }
                else if (reader.NodeType == XmlNodeType.Element)
                {
                    reader.Skip();
                    continue;
                }

                reader.Read();
            }
        }

        if (string.IsNullOrEmpty(include))
        {
            return;
        }

        if (isReference)
        {
            packageReferences.Add(new Item(include, NullIfEmpty(version), NullIfEmpty(versionOverride)));
        }
        else if (!string.IsNullOrEmpty(version))
        {
            packageVersions[include] = version;
        }
    }

    // Reads an element's text and leaves the reader on its end, or on the element itself when it is empty.
    private static string ReadText(XmlReader reader)
    {
        if (reader.IsEmptyElement)
        {
            return string.Empty;
        }

        int depth = reader.Depth;
        var text = new StringBuilder();
        reader.Read();
        while (!reader.EOF && !(reader.NodeType == XmlNodeType.EndElement && reader.Depth == depth))
        {
            switch (reader.NodeType)
            {
                case XmlNodeType.Text
                or XmlNodeType.CDATA
                or XmlNodeType.Whitespace
                or XmlNodeType.SignificantWhitespace:
                    text.Append(reader.Value);
                    reader.Read();
                    break;
                case XmlNodeType.Element:
                    reader.Skip();
                    break;
                default:
                    reader.Read();
                    break;
            }
        }

        return text.ToString().Trim();
    }

    private static bool Is(string? name, string expected) =>
        string.Equals(name, expected, StringComparison.OrdinalIgnoreCase);

    private static string? NullIfEmpty(string? value) => string.IsNullOrEmpty(value) ? null : value;
}
