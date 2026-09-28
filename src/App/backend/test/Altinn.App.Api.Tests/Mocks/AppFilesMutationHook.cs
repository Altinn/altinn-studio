using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;

namespace App.IntegrationTests.Mocks.Services;

/// <summary>
/// A change a test makes to the loaded app files before the host starts. Register it as a singleton;
/// <see cref="Apply"/> runs every registered hook against the loaded <see cref="AppFiles"/> snapshot.
/// </summary>
/// <param name="Mutate">Returns the snapshot the app should run with, given the one loaded from disk</param>
internal sealed record AppFilesMutationHook(Func<AppFiles, AppFiles> Mutate)
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>
    /// A hook that changes <c>config/applicationmetadata.json</c>: the file is parsed, changed by
    /// <paramref name="mutate"/> and serialized back into the snapshot.
    /// </summary>
    public static AppFilesMutationHook ApplicationMetadata(Action<ApplicationMetadata> mutate) =>
        new(files =>
        {
            ApplicationMetadata metadata = ApplicationMetadataParser.Parse(files);
            mutate(metadata);
            return files.WithApplicationMetadata(JsonSerializer.SerializeToUtf8Bytes(metadata, _jsonSerializerOptions));
        });

    /// <summary>
    /// Replaces the snapshot in the loaded <see cref="AppFilesAccessor"/> with the result of the registered hooks,
    /// in registration order, so that every service reads the changed files. Must run after every other test
    /// service registration.
    /// </summary>
    public static void Apply(IServiceCollection services)
    {
        var hooks = services
            .Where(d => d.ServiceType == typeof(AppFilesMutationHook))
            .Select(d =>
                d.ImplementationInstance as AppFilesMutationHook
                ?? throw new InvalidOperationException(
                    $"{nameof(AppFilesMutationHook)} must be registered as an instance: services.AddSingleton(new {nameof(AppFilesMutationHook)}(...))"
                )
            )
            .ToList();
        if (hooks.Count == 0)
        {
            return;
        }

        var accessor =
            services
                .Where(d => d.ServiceType == typeof(AppFilesAccessor))
                .Select(d => d.ImplementationInstance as AppFilesAccessor)
                .SingleOrDefault(a => a is not null)
            ?? throw new InvalidOperationException(
                $"No loaded {nameof(AppFilesAccessor)} is registered. AddAltinnAppServices must run before the test services."
            );

        AppFiles files = accessor.Current;
        foreach (var hook in hooks)
        {
            files = hook.Mutate(files);
        }

        accessor.Update(files);
    }
}
