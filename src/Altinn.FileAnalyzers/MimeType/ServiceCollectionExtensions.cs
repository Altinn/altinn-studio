using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Microsoft.Extensions.DependencyInjection;

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
        }
    }
}
