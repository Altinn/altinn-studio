using System.Collections;
using System.Reflection;
using System.Xml.Serialization;
using Altinn.App.Analyzers.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Analyzers.Tests.Process;

/// <summary>
/// Pins the analyzer's copy of the elements the runtime reads in a task's configuration to the XML serialization
/// attributes of the classes it deserializes them into. If it fails, a setting was added, renamed or removed, and
/// <see cref="TaskConfigurationSchema"/> must follow.
/// </summary>
public class TaskConfigurationSchemaTests
{
    private const string AltinnNamespace = "http://altinn.no/process";

    [Fact]
    public void The_Schema_Matches_The_Runtime_Classes()
    {
        var property = typeof(ExtensionElements).GetProperty(nameof(ExtensionElements.TaskExtension));
        Assert.NotNull(property);

        Assert.Equal(Describe(property), Describe(TaskConfigurationSchema.TaskExtension));
    }

    [Fact]
    public void The_Action_Types_Match_The_Runtime_Enum()
    {
        var names = typeof(ActionType)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Select(field => field.GetCustomAttribute<XmlEnumAttribute>()?.Name ?? field.Name);

        Assert.Equal(
            names.Order(StringComparer.Ordinal),
            TaskConfigurationUtils.ActionTypes.Order(StringComparer.Ordinal)
        );
    }

    /// <summary>
    /// XmlSerializer reads every other value as text, which never fails. If this fails, a value it converts was added
    /// or retyped, and <c>ReportUnreadableValues</c> in <see cref="TaskConfigurationUtils"/> must check it.
    /// </summary>
    [Fact]
    public void Only_The_Values_The_Analyzer_Checks_Are_Read_As_Anything_But_Text()
    {
        var property = typeof(ExtensionElements).GetProperty(nameof(ExtensionElements.TaskExtension));
        Assert.NotNull(property);

        var values = new List<string>();
        CollectConvertedValues(property.PropertyType, "", values);

        Assert.Equal(
            ["actions/action/@type: ActionType", "signatureConfig/runDefaultValidator: Boolean"],
            values.Order(StringComparer.Ordinal)
        );
    }

    /// <summary>The values under <paramref name="type"/> that XmlSerializer converts from text, with their type.</summary>
    private static void CollectConvertedValues(Type type, string path, List<string> values)
    {
        foreach (var property in type.GetProperties())
        {
            var name = property.GetCustomAttribute<XmlArrayAttribute>() is { } array
                ? $"{array.ElementName}/{property.GetCustomAttribute<XmlArrayItemAttribute>()?.ElementName}"
                : property.GetCustomAttribute<XmlElementAttribute>()?.ElementName
                    ?? (
                        property.GetCustomAttribute<XmlAttributeAttribute>() is { } attribute
                            ? "@" + attribute.AttributeName
                            : null
                    )
                    ?? (property.IsDefined(typeof(XmlTextAttribute)) ? "text()" : null);
            if (name is null)
            {
                continue;
            }

            var valueType = IsList(property.PropertyType) ? ItemType(property.PropertyType) : property.PropertyType;
            valueType = Nullable.GetUnderlyingType(valueType) ?? valueType;
            if (valueType == typeof(string))
            {
                continue;
            }

            if (valueType.IsClass)
            {
                CollectConvertedValues(valueType, $"{path}{name}/", values);
            }
            else
            {
                values.Add($"{path}{name}: {valueType.Name}");
            }
        }
    }

    /// <summary>The analyzer's element, as an indented outline of its name, multiplicity and children.</summary>
    private static string Describe(TaskConfigElement element, string indent = "") =>
        $"{indent}{element.Name}{Flags(element.Repeated, element.HasEnvironment)}\n"
        + string.Concat(
            element.Children.OrderBy(c => c.Name, StringComparer.Ordinal).Select(c => Describe(c, indent + "  "))
        );

    /// <summary>A property's element, read from its XML serialization attributes the way XmlSerializer reads them.</summary>
    private static string Describe(PropertyInfo property, string indent = "")
    {
        if (property.GetCustomAttribute<XmlArrayAttribute>() is { } array)
        {
            // A list in a wrapper element: every occurrence of the wrapper adds to the same list.
            var item = property.GetCustomAttribute<XmlArrayItemAttribute>();
            Assert.NotNull(item);
            Assert.Equal(AltinnNamespace, array.Namespace);
            Assert.Equal(AltinnNamespace, item.Namespace);
            return $"{indent}{array.ElementName}{Flags(repeated: true, hasEnvironment: false)}\n"
                + Describe(item.ElementName, ItemType(property.PropertyType), repeated: true, indent + "  ");
        }

        var element = property.GetCustomAttribute<XmlElementAttribute>();
        Assert.NotNull(element);
        Assert.Equal(AltinnNamespace, element.Namespace);
        var isList = IsList(property.PropertyType);
        return Describe(
            element.ElementName,
            isList ? ItemType(property.PropertyType) : property.PropertyType,
            isList,
            indent
        );
    }

    private static string Describe(string name, Type type, bool repeated, string indent)
    {
        var properties = type == typeof(string) || !type.IsClass ? [] : type.GetProperties();

        // XmlSerializer also reads a property without an attribute, as an element named after it. Every property it
        // reads must say how, so none is left out of the outline below.
        Assert.All(
            properties.Where(p => p.SetMethod?.IsPublic == true || IsList(p.PropertyType)),
            p =>
                Assert.True(
                    p.IsDefined(typeof(XmlElementAttribute))
                        || p.IsDefined(typeof(XmlArrayAttribute))
                        || p.IsDefined(typeof(XmlAttributeAttribute))
                        || p.IsDefined(typeof(XmlTextAttribute))
                        || p.IsDefined(typeof(XmlIgnoreAttribute)),
                    $"{type.Name}.{p.Name} is read by XmlSerializer but has no XML serialization attribute"
                )
        );

        var hasEnvironment = properties.Any(p =>
            p.GetCustomAttribute<XmlAttributeAttribute>() is { AttributeName: "env", Namespace: null }
        );
        var children = properties
            .Where(p =>
                p.GetCustomAttribute<XmlElementAttribute>() is not null
                || p.GetCustomAttribute<XmlArrayAttribute>() is not null
            )
            .Select(p => (Name: ElementName(p), Text: Describe(p, indent + "  ")))
            .OrderBy(c => c.Name, StringComparer.Ordinal)
            .Select(c => c.Text);
        return $"{indent}{name}{Flags(repeated, hasEnvironment)}\n" + string.Concat(children);
    }

    private static string ElementName(PropertyInfo property) =>
        property.GetCustomAttribute<XmlArrayAttribute>()?.ElementName
        ?? property.GetCustomAttribute<XmlElementAttribute>()?.ElementName
        ?? "";

    private static bool IsList(Type type) => type != typeof(string) && typeof(IEnumerable).IsAssignableFrom(type);

    private static Type ItemType(Type listType) => Assert.Single(listType.GetGenericArguments());

    private static string Flags(bool repeated, bool hasEnvironment) =>
        (repeated ? " (repeated)" : "") + (hasEnvironment ? " (env)" : "");
}
