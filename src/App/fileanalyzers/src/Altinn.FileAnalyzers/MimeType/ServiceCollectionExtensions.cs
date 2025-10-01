using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Microsoft.Extensions.DependencyInjection;
using MimeDetective;

namespace Altinn.FileAnalyzers.MimeType;

/// <summary>
/// Extension methods for adding MimeType analysis and validation to the service collection
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds support for MimeType analysis and validation by registering
    /// * IFileAnalyser implementation
    /// * IFileValidator implementation
    /// based on the MimeDetective library.
    /// </summary>
    public static IServiceCollection AddMimeTypeValidation(this IServiceCollection services)
    {
        var inspector = new ContentInspectorBuilder()
        {
            Definitions = MimeDetective.Definitions.DefaultDefinitions.All(),
            MatchEvaluatorOptions = new MimeDetective.Engine.DefinitionMatchEvaluatorOptions()
            {
                IncludeMatchesComplete = true,
                IncludeMatchesFailed = false,
                IncludeMatchesPartial = true,
                IncludeSegmentsPrefix = true,
                IncludeSegmentsStrings = true,
            },
        }.Build();
        services.AddMimeTypeValidation(inspector);
        return services;
    }

    /// <summary>
    /// Adds support for MimeType analysis and validation by registering
    /// * IFileAnalyser implementation
    /// * IFileValidator implementation
    /// based on the MimeDetective library.
    /// </summary>
    public static IServiceCollection AddMimeTypeValidation(
        this IServiceCollection services,
        IContentInspector inspector
    )
    {
        services.AddSingleton<IFileAnalyser, MimeTypeAnalyser>();
        services.AddSingleton<IFileValidator, MimeTypeValidator>();

        services.AddSingleton<IContentInspector>(inspector);
        return services;
    }
}
