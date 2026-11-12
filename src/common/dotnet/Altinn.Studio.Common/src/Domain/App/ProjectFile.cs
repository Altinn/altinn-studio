using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Xml;

namespace Altinn.Studio.Common.Domain.App;

/// <summary>
/// The properties, package references and central package versions of an MSBuild file, such as a <c>.csproj</c> or
/// <c>Directory.Packages.props</c>, as written and in the order they are written.
/// </summary>
/// <remarks>
/// It does not evaluate the file as MSBuild does. It ignores imports and targets, and only notes that a condition
/// applies to a property or an item, so that whoever resolves the values can take such a one for unknown.
/// </remarks>
internal sealed class ProjectFile
{
    // No version or target framework is longer, and a limit keeps properties that repeat each other from growing.
    private const int MaxValueLength = 4096;

    private static readonly XmlReaderSettings s_settings = new()
    {
        DtdProcessing = DtdProcessing.Ignore,
        XmlResolver = null,
        IgnoreComments = true,
        IgnoreProcessingInstructions = true,
        CloseInput = false,
    };

    private ProjectFile(
        List<Property> properties,
        List<Item> packageReferences,
        List<Item> packageVersions,
        List<Item> projectReferences
    )
    {
        Properties = properties;
        PackageReferences = packageReferences;
        PackageVersions = packageVersions;
        ProjectReferences = projectReferences;
    }

    /// <summary>What an item element does to the items of its kind.</summary>
    public enum Operation
    {
        /// <summary><c>Include</c> adds an item.</summary>
        Include,

        /// <summary><c>Update</c> changes an item that an earlier element included.</summary>
        Update,

        /// <summary><c>Remove</c> takes an item away.</summary>
        Remove,
    }

    /// <summary>The properties the file sets, in order. A later one of the same name replaces an earlier one.</summary>
    public IReadOnlyList<Property> Properties { get; }

    /// <summary>The <c>PackageReference</c> elements of the file, in order.</summary>
    public IReadOnlyList<Item> PackageReferences { get; }

    /// <summary>The <c>PackageVersion</c> elements of central package management, in order.</summary>
    public IReadOnlyList<Item> PackageVersions { get; }

    /// <summary>The <c>ProjectReference</c> elements of the file, in order, whose name is the path of a project.</summary>
    public IReadOnlyList<Item> ProjectReferences { get; }

    /// <summary>A property as written in the file, before the properties it refers to are resolved.</summary>
    /// <param name="Name">The name of the element.</param>
    /// <param name="Value">The text of the element.</param>
    /// <param name="Conditional">Whether a condition decides if it is set.</param>
    public sealed record Property(string Name, string Value, bool Conditional);

    /// <summary>A package or project item as written in the file, before properties are resolved.</summary>
    /// <param name="Operation">What the element does.</param>
    /// <param name="Name">
    /// What <c>Include</c>, <c>Update</c> or <c>Remove</c> names: a package ID, or the path of a project.
    /// </param>
    /// <param name="Version">
    /// The <c>Version</c> attribute or element, which is empty when the file sets it to nothing and <c>null</c> when
    /// the file does not set it. An update with an empty value clears the version, and one without leaves it.
    /// </param>
    /// <param name="VersionOverride">The <c>VersionOverride</c> attribute or element, in the same way.</param>
    /// <param name="Conditional">
    /// Whether a condition decides if the element applies, or what its version or version override is.
    /// </param>
    public sealed record Item(
        Operation Operation,
        string Name,
        string? Version,
        string? VersionOverride,
        bool Conditional
    );

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
        var properties = new List<Property>();
        var packageReferences = new List<Item>();
        var packageVersions = new List<Item>();
        var projectReferences = new List<Item>();
        string? group = null;
        bool groupIsConditional = false;
        while (reader.Read())
        {
            if (reader.NodeType != XmlNodeType.Element)
            {
                continue;
            }

            if (reader.Depth == 1)
            {
                group = reader.LocalName;
                groupIsConditional = HasCondition(reader);
            }
            else if (reader.Depth == 2 && Is(group, "PropertyGroup"))
            {
                string name = reader.LocalName;
                bool conditional = groupIsConditional || HasCondition(reader);
                properties.Add(new Property(name, ReadText(reader), conditional));
            }
            else if (reader.Depth == 2 && Is(group, "ItemGroup"))
            {
                List<Item>? items = reader.LocalName switch
                {
                    var name when Is(name, "PackageReference") => packageReferences,
                    var name when Is(name, "PackageVersion") => packageVersions,
                    var name when Is(name, "ProjectReference") => projectReferences,
                    _ => null,
                };
                if (items is not null)
                {
                    ReadItem(reader, groupIsConditional, items);
                }
            }
        }

        return new ProjectFile(properties, packageReferences, packageVersions, projectReferences);
    }

    /// <summary>
    /// Sets the file's properties in a set of resolved ones, in order, as MSBuild does: a property gets the values
    /// that the properties it refers to have where it is set, not the ones they get later. A value is <c>null</c>
    /// when the property is set but to something unknown, which is so for one that a condition decides.
    /// </summary>
    public void SetProperties(Dictionary<string, string?> resolved)
    {
        foreach (Property property in Properties)
        {
            resolved[property.Name] = property.Conditional ? null : Expand(property.Value, resolved);
        }
    }

    /// <summary>
    /// Replaces each <c>$(Name)</c> in a value with the property's resolved value. Returns <c>null</c> when a
    /// property is not set or not known, when the value calls a property function, or when the result is longer
    /// than any value this model reads, since the result would then be unknown.
    /// </summary>
    public static string? Expand(string? value, IReadOnlyDictionary<string, string?> resolved)
    {
        if (value is null || value.Length > MaxValueLength)
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
            if (
                !IsPropertyName(name)
                || !resolved.TryGetValue(name, out string? propertyValue)
                || propertyValue is null
                || result.Length + propertyValue.Length > MaxValueLength
            )
            {
                return null;
            }

            result.Append(value, position, start - position).Append(propertyValue);
            position = end + 1;
            start = value.IndexOf("$(", position, StringComparison.Ordinal);
        }

        // The text between the references counts too.
        result.Append(value, position, value.Length - position);
        return result.Length > MaxValueLength ? null : result.ToString();
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

    private static void ReadItem(XmlReader reader, bool groupIsConditional, List<Item> items)
    {
        string? name = null;
        var operation = Operation.Include;
        bool conditional = groupIsConditional;
        string? version = null;
        string? versionOverride = null;
        while (reader.MoveToNextAttribute())
        {
            if (Is(reader.LocalName, "Include"))
            {
                (name, operation) = (reader.Value.Trim(), Operation.Include);
            }
            else if (Is(reader.LocalName, "Update"))
            {
                (name, operation) = (reader.Value.Trim(), Operation.Update);
            }
            else if (Is(reader.LocalName, "Remove"))
            {
                (name, operation) = (reader.Value.Trim(), Operation.Remove);
            }
            else if (Is(reader.LocalName, "Condition"))
            {
                conditional = true;
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
                    conditional |= HasCondition(reader);
                    version = ReadText(reader);
                }
                else if (reader.NodeType == XmlNodeType.Element && Is(reader.LocalName, "VersionOverride"))
                {
                    conditional |= HasCondition(reader);
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

        if (name is not null && name.Length > 0)
        {
            items.Add(new Item(operation, name, version, versionOverride, conditional));
        }
    }

    // Leaves the reader on the element.
    private static bool HasCondition(XmlReader reader)
    {
        bool has = false;
        while (reader.MoveToNextAttribute())
        {
            has |= Is(reader.LocalName, "Condition");
        }

        reader.MoveToElement();
        return has;
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
}
