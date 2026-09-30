using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Internal.App;
using Microsoft.Extensions.Configuration;

namespace Altinn.App.Core.Internal.ProvisionedSecrets;

/// <summary>
/// <para>One of the files the platform provisions into the app's secrets directory, described by the two
/// values the libraries configure and the one value the platform resolves.</para>
/// <para>The libraries configure the configuration key that names the file — because what the file is called
/// is the writer's to decide, the operator for a deployed app and studioctl for a local run — and the object
/// the file wraps its contents in, which is the one thing about a provisioned file the libraries do hold.
/// The platform answers with the name itself, and only the app's configuration can say it.</para>
/// <para>The descriptors in <see cref="ProvisionedSecretFiles"/> carry the configured values alone, with
/// <see cref="FileName"/> null. <see cref="Resolve"/> reads the platform's answer and returns a copy carrying
/// it, and <see cref="ProvisionedSecrets"/> keeps those copies. Consumers hold the static descriptor and
/// never see a file name beside it that they would have to explain.</para>
/// </summary>
/// <param name="FileNameKey">
/// Configured. The configuration key naming the file inside the secrets directory. Required in every
/// environment; see <see cref="ProvisionedSecrets.FromConfiguration"/>.
/// </param>
/// <param name="SectionName">
/// Configured. The root object the file wraps its contents in, and therefore the configuration section they
/// bind from.
/// </param>
internal sealed record ProvisionedSecretFile(string FileNameKey, string SectionName)
{
    private static readonly char[] _directorySeparators = ['/', '\\'];

    /// <summary>
    /// <para>Resolved. The name the platform gave this file, read from <see cref="FileNameKey"/>.</para>
    /// <para>Null on the static descriptors the libraries declare, and set on the copy <see cref="Resolve"/>
    /// returns. There is no library default here, deliberately: a name the libraries had guessed would read
    /// nothing at all the day the writer changed it, and say nothing about why.</para>
    /// </summary>
    public string? FileName { get; private init; }

    /// <summary>
    /// Whether this is a resolved copy, carrying the name the platform gave the file.
    /// </summary>
    [MemberNotNullWhen(true, nameof(FileName))]
    public bool IsResolved => FileName is not null;

    /// <summary>
    /// <para>This file with the name <see cref="FileNameKey"/> gives it in <paramref name="configuration"/>.
    /// This is the one place that variable is read and validated.</para>
    /// <para>A value that is missing, or that is not a bare file name, fails startup. There is no location to
    /// fall back to that would not be a guess.</para>
    /// </summary>
    /// <param name="configuration">The app's own configuration.</param>
    /// <exception cref="ApplicationConfigException">The value is missing or is not a bare file name.</exception>
    internal ProvisionedSecretFile Resolve(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        if (!TryReadFileName(configuration, out string? fileName, out string? error))
        {
            throw new ApplicationConfigException(error);
        }

        return this with
        {
            FileName = fileName,
        };
    }

    /// <summary>
    /// <para>The same resolution for the one caller that must not fail on it: the sweep of the secrets
    /// directory into the app's own configuration root excludes the hosted files by name, and a name the
    /// platform never set excludes nothing. Failing there would only pre-empt the provisioned secrets startup
    /// check, which reports the same thing and names the variable.</para>
    /// </summary>
    /// <param name="configuration">The app's own configuration.</param>
    /// <param name="resolved">This file carrying the name the platform gave it, when there is one.</param>
    internal bool TryResolve(IConfiguration configuration, [NotNullWhen(true)] out ProvisionedSecretFile? resolved)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        if (!TryReadFileName(configuration, out string? fileName, out _))
        {
            resolved = null;
            return false;
        }

        resolved = this with { FileName = fileName };
        return true;
    }

    /// <summary>
    /// The name this file is provisioned under. It has to be a bare name inside the secrets directory: a path
    /// would let whoever set it read a file somewhere else entirely, which is the same hole as letting the app
    /// choose.
    /// </summary>
    /// <param name="configuration">The app's own configuration.</param>
    /// <param name="fileName">The name the platform gave the file.</param>
    /// <param name="error">Why the value cannot be used, when it cannot.</param>
    private bool TryReadFileName(
        IConfiguration configuration,
        [NotNullWhen(true)] out string? fileName,
        [NotNullWhen(false)] out string? error
    )
    {
        string? value = configuration[FileNameKey];
        if (string.IsNullOrWhiteSpace(value))
        {
            fileName = null;
            error = ProvisionedSecrets.MissingValueMessage(FileNameKey);

            return false;
        }

        if (value.IndexOfAny(_directorySeparators) >= 0 || value is "." or "..")
        {
            fileName = null;
            error =
                $"'{FileNameKey}' must name a file inside the directory named by '{ProvisionedSecrets.DirectoryKey}', "
                + $"but it is set to '{value}'. {ProvisionedSecrets.WhereTheValueComesFrom}";

            return false;
        }

        fileName = value;
        error = null;

        return true;
    }
}
