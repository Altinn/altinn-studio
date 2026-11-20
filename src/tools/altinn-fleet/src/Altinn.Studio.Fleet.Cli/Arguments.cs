namespace Altinn.Studio.Fleet.Cli;

/// <summary>Thrown when the command line is not valid. The message says what to fix.</summary>
internal sealed class UsageException(string message) : Exception(message);

/// <summary>A command line split into its command words, flags, options with a value and other arguments.</summary>
internal sealed class Arguments
{
    private readonly Dictionary<string, string?> _options = new(StringComparer.Ordinal);
    private readonly HashSet<string> _used = new(StringComparer.Ordinal);

    private Arguments(List<string> positionals)
    {
        Positionals = positionals;
    }

    public List<string> Positionals { get; }

    /// <summary>
    /// Parses <c>--name value</c>, <c>--name=value</c> and <c>--flag</c>, wherever they are. <paramref name="flags"/>
    /// names the options that take no value. Everything after <c>--</c> is an argument.
    /// </summary>
    public static Arguments Parse(IReadOnlyList<string> args, IReadOnlySet<string> flags)
    {
        var positionals = new List<string>();
        var options = new List<(string, string?)>();
        for (int i = 0; i < args.Count; i++)
        {
            string arg = args[i];
            if (arg == "--")
            {
                positionals.AddRange(args.Skip(i + 1));
                break;
            }

            if (!arg.StartsWith("--", StringComparison.Ordinal) || arg.Length == 2)
            {
                positionals.Add(arg);
                continue;
            }

            int equals = arg.IndexOf('=', StringComparison.Ordinal);
            string name = equals < 0 ? arg[2..] : arg[2..equals];
            if (flags.Contains(name))
            {
                if (equals >= 0)
                {
                    throw new UsageException($"--{name} takes no value.");
                }

                options.Add((name, null));
            }
            else if (equals >= 0)
            {
                options.Add((name, arg[(equals + 1)..]));
            }
            else if (i + 1 < args.Count)
            {
                options.Add((name, args[++i]));
            }
            else
            {
                throw new UsageException($"--{name} needs a value.");
            }
        }

        var parsed = new Arguments(positionals);
        foreach ((string name, string? value) in options)
        {
            if (!parsed._options.TryAdd(name, value))
            {
                throw new UsageException($"--{name} is given more than once.");
            }
        }

        return parsed;
    }

    public bool Flag(string name)
    {
        _used.Add(name);
        return _options.ContainsKey(name);
    }

    public string? Value(string name)
    {
        _used.Add(name);
        return _options.GetValueOrDefault(name);
    }

    public int Int(string name, int defaultValue, int min, int max)
    {
        string? value = Value(name);
        if (value is null)
        {
            return defaultValue;
        }

        return int.TryParse(value, out int parsed) && parsed >= min && parsed <= max
            ? parsed
            : throw new UsageException($"--{name} must be a whole number from {min} to {max}.");
    }

    /// <summary>Fails on an option the command did not ask for, so that a typo is not ignored.</summary>
    public void RejectUnused()
    {
        string? unknown = _options.Keys.FirstOrDefault(name => !_used.Contains(name));
        if (unknown is not null)
        {
            throw new UsageException($"Unknown option --{unknown}.");
        }
    }
}
