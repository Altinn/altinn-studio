using System;

namespace Altinn.Studio.Common.Domain;

/// <summary>An environment that apps run in, such as production or tt02.</summary>
/// <remarks>
/// Production has two names. The runtime calls it <c>prod</c>: the gateway, the operator and the service owners'
/// clusters and resource groups. The registries on Altinn's CDN call it <c>production</c>: the service owner registry
/// <c>altinn-orgs.json</c> and <c>environments.json</c>, and Designer stores that name. <see cref="TryParse"/>
/// accepts both, and <see cref="Name"/> is always the runtime's <c>prod</c>, since this type is about where apps run.
/// It is a struct, so <c>default</c> is an instance that no parsing produced. Reading its name throws.
/// </remarks>
public readonly record struct RuntimeEnvironment
{
    // The name the runtime uses, and the one this type gives.
    private const string ProductionName = "prod";

    // The name the registries on the CDN and Designer use, which is only read.
    private const string ProductionAlias = "production";

    private readonly string? _name;

    private RuntimeEnvironment(string name)
    {
        _name = name;
    }

    /// <summary>Production.</summary>
    public static RuntimeEnvironment Production { get; } = new(ProductionName);

    /// <summary>tt02, where service owners test their apps before production.</summary>
    public static RuntimeEnvironment TT02 { get; } = new("tt02");

    /// <summary>The name the runtime uses, such as <c>prod</c> or <c>tt02</c>.</summary>
    /// <exception cref="InvalidOperationException">This is the default value of the type.</exception>
    public string Name => _name ?? throw DefaultValue.Of(nameof(RuntimeEnvironment));

    /// <summary>Whether this is production.</summary>
    public bool IsProduction => _name == ProductionName;

    /// <summary>
    /// Parses <c>prod</c> or <c>production</c>, or a test environment: lower-case letters followed by digits, such as
    /// <c>tt02</c> or <c>at22</c>.
    /// </summary>
    public static bool TryParse(string? name, out RuntimeEnvironment environment)
    {
        RuntimeEnvironment? parsed = name switch
        {
            null => null,
            ProductionName or ProductionAlias => Production,
            "tt02" => TT02,
            _ when IsTestEnvironmentName(name) => new RuntimeEnvironment(name),
            _ => null,
        };
        environment = parsed.GetValueOrDefault();
        return parsed.HasValue;
    }

    /// <summary>Parses an environment name, or throws when it names none.</summary>
    /// <exception cref="ArgumentException">The name is not an environment name.</exception>
    public static RuntimeEnvironment Parse(string name) =>
        TryParse(name, out RuntimeEnvironment environment)
            ? environment
            : throw new ArgumentException($"'{name}' is not a runtime environment.", nameof(name));

    /// <summary>Returns <see cref="Name"/>.</summary>
    public override string ToString() => _name ?? string.Empty;

    private static bool IsTestEnvironmentName(string name)
    {
        int letters = 0;
        while (letters < name.Length && AsciiText.IsLower(name[letters]))
        {
            letters++;
        }

        if (letters == 0 || letters == name.Length)
        {
            return false;
        }

        for (int i = letters; i < name.Length; i++)
        {
            if (!AsciiText.IsDigit(name[i]))
            {
                return false;
            }
        }

        return true;
    }
}
