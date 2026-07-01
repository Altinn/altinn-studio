using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.WorkflowEngine.ContractTesting;

/// <summary>
/// A single JSON field in the workflow-engine wire contract, reduced to the parts that are
/// observable on the wire: its JSON property name, a normalized type <see cref="Kind"/>, and
/// whether it may be <c>null</c>. CLR namespaces, visibility, method bodies, attributes that do
/// not affect the wire, and XML documentation are deliberately excluded so that the engine's
/// canonical types and the app's curated copies describe to the same value when they agree.
/// </summary>
internal sealed record WireField(string Name, string Kind, bool Nullable);

/// <summary>
/// A single object type in the wire contract: its simple (namespace-free) name and its fields,
/// always sorted by name so the description is deterministic regardless of reflection order.
/// </summary>
internal sealed record WireType(string Name, IReadOnlyList<WireField> Fields);

/// <summary>
/// Reflects over a set of DTO types and produces a normalized, language-neutral description of the
/// JSON wire shapes they participate in. Two type sets that serialize to and from the same JSON —
/// even if they live in different assemblies, use different accessibility, or use different (but
/// wire-equivalent) JSON converters — produce equal descriptions.
///
/// This is the shared engine of the workflow-engine contract-drift tests. The engine side describes
/// its canonical types and commits the result as <c>wire-contract.verified.json</c>; the app side
/// describes its curated copies and asserts they remain compatible with that committed description.
/// </summary>
internal static class WireContract
{
    private static readonly JsonSerializerOptions _serializerOptions = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>
    /// Returns the absolute directory that holds this source file (and the committed
    /// <c>wire-contract.verified.json</c> next to it). Resolves via <see cref="CallerFilePathAttribute"/>
    /// so it works even when this file is compiled as a linked source into another project.
    /// </summary>
    public static string ContractDirectory([CallerFilePath] string path = "") =>
        Path.GetDirectoryName(path) ?? throw new InvalidOperationException("Could not resolve the contract directory.");

    /// <summary>
    /// Builds the normalized wire description for the given root types, expanding nested object
    /// types reachable through fields, arrays, dictionaries, and generic arguments.
    /// </summary>
    public static IReadOnlyDictionary<string, WireType> Describe(IEnumerable<Type> roots) =>
        new Describer().Build(roots);

    /// <summary>Serializes a description to canonical (sorted, indented) JSON.</summary>
    public static string Serialize(IReadOnlyDictionary<string, WireType> types)
    {
        var sorted = new SortedDictionary<string, WireType>(StringComparer.Ordinal);
        foreach (var (name, type) in types)
        {
            sorted[name] = type;
        }

        return JsonSerializer.Serialize(sorted, _serializerOptions);
    }

    /// <summary>Deserializes a description previously produced by <see cref="Serialize"/>.</summary>
    public static IReadOnlyDictionary<string, WireType> Deserialize(string json) =>
        JsonSerializer.Deserialize<Dictionary<string, WireType>>(json, _serializerOptions)
        ?? throw new InvalidOperationException("Could not deserialize the wire contract description.");

    /// <summary>
    /// Compares an app-side description against the engine's canonical description and returns a list
    /// of human-readable incompatibilities (empty when the app is compatible).
    ///
    /// The check is directional, reflecting that the app is a deliberate, curated consumer of the
    /// engine contract rather than a mirror of it:
    /// <list type="bullet">
    ///   <item>Every type and field the app models must exist on the engine with the same kind and
    ///         nullability — the app must never introduce or reshape a field the engine does not know.</item>
    ///   <item>Every non-nullable engine field must be modeled by the app — the app must not silently
    ///         drop a value the engine always sends or requires.</item>
    ///   <item>Optional (nullable) engine fields and engine-only types may be omitted by the app —
    ///         this is the legitimate subsetting the app relies on.</item>
    /// </list>
    /// </summary>
    public static IReadOnlyList<string> FindIncompatibilities(
        IReadOnlyDictionary<string, WireType> app,
        IReadOnlyDictionary<string, WireType> engine
    )
    {
        var problems = new List<string>();

        foreach (var (name, appType) in app.OrderBy(x => x.Key, StringComparer.Ordinal))
        {
            if (!engine.TryGetValue(name, out var engineType))
            {
                problems.Add($"Type '{name}': modeled by the app but absent from the engine contract.");
                continue;
            }

            var engineFields = engineType.Fields.ToDictionary(f => f.Name, StringComparer.Ordinal);
            var appFields = appType.Fields.Select(f => f.Name).ToHashSet(StringComparer.Ordinal);

            foreach (var appField in appType.Fields)
            {
                if (!engineFields.TryGetValue(appField.Name, out var engineField))
                {
                    problems.Add($"{name}.{appField.Name}: present in the app but not in the engine contract.");
                    continue;
                }

                if (!string.Equals(appField.Kind, engineField.Kind, StringComparison.Ordinal))
                {
                    problems.Add(
                        $"{name}.{appField.Name}: type mismatch (app '{appField.Kind}', engine '{engineField.Kind}')."
                    );
                }

                if (appField.Nullable != engineField.Nullable)
                {
                    problems.Add(
                        $"{name}.{appField.Name}: nullability mismatch (app nullable={appField.Nullable}, engine nullable={engineField.Nullable})."
                    );
                }
            }

            foreach (var engineField in engineType.Fields.Where(f => !f.Nullable && !appFields.Contains(f.Name)))
            {
                problems.Add(
                    $"{name}.{engineField.Name}: required by the engine (non-nullable) but not modeled by the app."
                );
            }
        }

        return problems;
    }

    private sealed class Describer
    {
        private readonly Queue<Type> _queue = new();
        private readonly Dictionary<string, WireType> _types = new(StringComparer.Ordinal);
        private readonly HashSet<string> _done = new(StringComparer.Ordinal);
        private readonly NullabilityInfoContext _nullability = new();

        public Dictionary<string, WireType> Build(IEnumerable<Type> roots)
        {
            foreach (var root in roots)
            {
                _queue.Enqueue(root);
            }

            while (_queue.Count > 0)
            {
                var type = _queue.Dequeue();

                // Enums and scalars carry their full wire shape inline at each use site (e.g.
                // "enum<string>{...}"), so they are never registered as standalone object types.
                if (type.IsEnum || ScalarKind(type) is not null)
                {
                    continue;
                }

                var name = TypeName(type);
                if (_done.Add(name))
                {
                    _types[name] = DescribeObject(type, name);
                }
            }

            return _types;
        }

        private WireType DescribeObject(Type type, string name)
        {
            var fields = new List<WireField>();
            foreach (var property in SerializableProperties(type))
            {
                var nullable = IsNullable(property);
                var kind = ResolveKind(Unwrap(property.PropertyType), property);
                fields.Add(new WireField(JsonName(property), kind, nullable));
            }

            fields.Sort((a, b) => string.CompareOrdinal(a.Name, b.Name));
            return new WireType(name, fields);
        }

        private string ResolveKind(Type type, ICustomAttributeProvider? member)
        {
            var converter = ConverterName(member) ?? ConverterName(type);
            if (converter == "WorkflowRefConverter")
            {
                return "string";
            }

            if (type == typeof(JsonElement))
            {
                return "json";
            }

            if (type.IsEnum)
            {
                return EnumKind(type, converter);
            }

            if (ScalarKind(type) is { } scalar)
            {
                return scalar;
            }

            if (DictionaryInterface(type) is { } dictionary)
            {
                var args = dictionary.GetGenericArguments();
                return $"map<{ResolveKind(Unwrap(args[0]), null)},{ResolveKind(Unwrap(args[1]), null)}>";
            }

            if (EnumerableElement(type) is { } element)
            {
                return $"array<{ResolveKind(Unwrap(element), null)}>";
            }

            _queue.Enqueue(type);
            return $"object<{TypeName(type)}>";
        }

        private static string? ScalarKind(Type type)
        {
            if (type == typeof(string))
            {
                return "string";
            }
            if (type == typeof(bool))
            {
                return "bool";
            }
            if (type == typeof(Guid))
            {
                return "guid";
            }
            if (type == typeof(DateTimeOffset) || type == typeof(DateTime))
            {
                return "datetimeoffset";
            }
            if (type == typeof(TimeSpan))
            {
                return "timespan";
            }
            if (type == typeof(long) || type == typeof(ulong))
            {
                return "long";
            }
            if (
                type == typeof(byte)
                || type == typeof(sbyte)
                || type == typeof(short)
                || type == typeof(ushort)
                || type == typeof(int)
                || type == typeof(uint)
            )
            {
                return "int";
            }
            if (type == typeof(float) || type == typeof(double) || type == typeof(decimal))
            {
                return "number";
            }

            return null;
        }

        private static string EnumKind(Type type, string? converter)
        {
            var asString = converter is "JsonStringEnumConverter" or "FlexibleEnumConverter";
            var members = Enum.GetValues(type)
                .Cast<object>()
                .Select(value =>
                    (Name: Enum.GetName(type, value), Value: Convert.ToInt64(value, CultureInfo.InvariantCulture))
                )
                .OrderBy(member => member.Value)
                .Select(member => $"{member.Name}={member.Value.ToString(CultureInfo.InvariantCulture)}");
            return $"enum<{(asString ? "string" : "int")}>{{{string.Join(",", members)}}}";
        }

        private bool IsNullable(PropertyInfo property)
        {
            if (property.PropertyType.IsValueType)
            {
                return Nullable.GetUnderlyingType(property.PropertyType) is not null;
            }

            return _nullability.Create(property).ReadState == NullabilityState.Nullable;
        }

        private static string JsonName(PropertyInfo property) =>
            property.GetCustomAttribute<JsonPropertyNameAttribute>()?.Name
            ?? JsonNamingPolicy.CamelCase.ConvertName(property.Name);

        private static IEnumerable<PropertyInfo> SerializableProperties(Type type) =>
            type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => p.GetIndexParameters().Length == 0)
                .Where(p => p.GetMethod is { IsPublic: true })
                .Where(p => !IsAlwaysIgnored(p));

        private static bool IsAlwaysIgnored(PropertyInfo property)
        {
            var ignore = property.GetCustomAttribute<JsonIgnoreAttribute>();
            return ignore is not null && ignore.Condition == JsonIgnoreCondition.Always;
        }

        private static string? ConverterName(ICustomAttributeProvider? provider)
        {
            var converterType = (provider?.GetCustomAttributes(typeof(JsonConverterAttribute), false) ?? [])
                .Cast<JsonConverterAttribute>()
                .FirstOrDefault()
                ?.ConverterType;
            if (converterType is null)
            {
                return null;
            }

            var name = converterType.Name;
            var tick = name.IndexOf('`', StringComparison.Ordinal);
            return tick >= 0 ? name[..tick] : name;
        }

        private static Type Unwrap(Type type) => Nullable.GetUnderlyingType(type) ?? type;

        private static Type? DictionaryInterface(Type type) =>
            Interfaces(type)
                .FirstOrDefault(i =>
                    i.IsGenericType
                    && (
                        i.GetGenericTypeDefinition() == typeof(IReadOnlyDictionary<,>)
                        || i.GetGenericTypeDefinition() == typeof(IDictionary<,>)
                    )
                );

        private static Type? EnumerableElement(Type type)
        {
            if (type == typeof(string))
            {
                return null;
            }

            return Interfaces(type)
                .FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEnumerable<>))
                ?.GetGenericArguments()[0];
        }

        private static IEnumerable<Type> Interfaces(Type type) =>
            type.IsInterface ? type.GetInterfaces().Prepend(type) : type.GetInterfaces();

        private static string TypeName(Type type)
        {
            if (!type.IsGenericType)
            {
                return type.Name;
            }

            var name = type.Name;
            var tick = name.IndexOf('`', StringComparison.Ordinal);
            if (tick >= 0)
            {
                name = name[..tick];
            }

            return $"{name}<{string.Join(",", type.GetGenericArguments().Select(TypeName))}>";
        }
    }
}
