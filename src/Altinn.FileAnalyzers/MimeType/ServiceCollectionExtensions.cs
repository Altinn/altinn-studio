using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Microsoft.Extensions.DependencyInjection;
using MimeDetective;

namespace Altinn.FileAnalyzers.MimeType
{
    /// <summary>
    /// Extension methods for adding MimeType analysis and validation to the service collection
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Extension method to add support for MimeType analysis and validation
        /// </summary>
        public static void AddMimeTypeValidation(this IServiceCollection services)
        {
            services.AddTransient<IFileAnalyser, MimeTypeAnalyser>();
            services.AddTransient<IFileValidator, MimeTypeValidator>();

            // Based on the documentation here: https://github.com/MediatedCommunications/Mime-Detective#2--slow-initialization--fast-execution
            var inspector = new ContentInspectorBuilder()
            {
                Definitions = MimeDetective.Definitions.Default.All(),
                MatchEvaluatorOptions = new MimeDetective.Engine.DefinitionMatchEvaluatorOptions()
                {
                    Include_Matches_Complete = true,
                    Include_Matches_Failed = false,
                    Include_Matches_Partial = true,
                    Include_Segments_Prefix = true,
                    Include_Segments_Strings = true
                }
            }
            .Build();

            services.AddSingleton(inspector);
        }
    }
}
