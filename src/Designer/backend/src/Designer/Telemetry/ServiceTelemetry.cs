using System;
using System.Diagnostics;
using System.Text.Json;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Telemetry;

internal static partial class ServiceTelemetry
{
    private const string AlwaysSample = "always";
    private const string AppRepoType = "app";
    private const string ProductionEnvironment = "production";
    private const string RuntimeProductionEnvironment = "prod";

    public static readonly ActivitySource Source = new("studio-designer");

    // Tail sampling is configured per collector pipeline, not globally.
    // We explicitly mark spans that must be retained.
    public static void SetAlwaysSample(this Activity? activity) => activity?.SetTag(Attributes.Sampling, AlwaysSample);

    public static void SetServiceOwner(this Activity? activity, string serviceOwner) =>
        activity?.SetTag(Attributes.ServiceOwner, serviceOwner.ToLowerInvariant());

    /// <summary>
    /// Sets the repository's service owner and type, and the app where the repository is one.
    /// </summary>
    public static void SetRepository(this Activity? activity, string serviceOwner, string repository)
    {
        activity.SetServiceOwner(serviceOwner);
        string repoType = RepoTypeOf(serviceOwner, repository);
        activity?.SetTag(Attributes.RepoType, repoType);
        if (repoType == AppRepoType)
        {
            activity?.SetTag(Attributes.App, repository.ToLowerInvariant());
        }
    }

    /// <summary>
    /// Sets an app, for a child span whose service owner is already on the root span.
    /// </summary>
    public static void SetApp(this Activity? activity, string app)
    {
        activity?.SetTag(Attributes.RepoType, AppRepoType);
        activity?.SetTag(Attributes.App, app.ToLowerInvariant());
    }

    public static void SetTargetEnvironment(this Activity? activity, string environment) =>
        activity?.SetTag(Attributes.Environment, RuntimeEnvironmentName(environment));

    public static void SetEndUser(this Activity? activity, string userName) =>
        activity?.SetTag(Attributes.EndUserId, userName);

    private static string RepoTypeOf(string serviceOwner, string repository) =>
        RepositoryNames.KindOf(serviceOwner, repository) switch
        {
            RepositoryKind.DataModels => "datamodels",
            RepositoryKind.Content => "content",
            RepositoryKind.Resources => "resources",
            _ => AppRepoType,
        };

    /// <summary>
    /// The value of an attribute that holds an enum member: its name in snake_case, the form the semantic
    /// conventions use for enum values, so that spans and metrics carry the same value.
    /// </summary>
    public static string EnumValue<TEnum>(TEnum value)
        where TEnum : struct, Enum => JsonNamingPolicy.SnakeCaseLower.ConvertName(value.ToString());

    /// <summary>
    /// The runtime's name for an environment: Designer calls the production environment production, and the
    /// runtime calls it prod.
    /// </summary>
    public static string RuntimeEnvironmentName(string environment) =>
        environment.Equals(ProductionEnvironment, StringComparison.OrdinalIgnoreCase)
            ? RuntimeProductionEnvironment
            : environment.ToLowerInvariant();
}
