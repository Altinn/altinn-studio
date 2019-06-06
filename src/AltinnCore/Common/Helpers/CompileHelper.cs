using System;
using System.Threading.Tasks;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;

namespace AltinnCore.Common.Helpers
{
    /// <summary>
    /// Helper class for compilation
    /// </summary>
    public static class CompileHelper
    {
        /// <summary>
        /// Creates an asynchronous task for compiling an app
        /// </summary>
        /// <param name="compilation">The ICompilation implementation</param>
        /// <param name="identifier">The service identifier</param>
        /// <returns>The started compile task</returns>
        public static Task<CodeCompilationResult> CompileService(ICompilation compilation, ServiceIdentifier identifier)
        {
            Func<CodeCompilationResult> compile =
                () =>
                    compilation.CreateServiceAssembly(
                        identifier.Org,
                        identifier.Service,
                        true);

            return Task<CodeCompilationResult>.Factory.StartNew(compile);
        }

        /// <summary>
        /// Converts the appId to a string that is valid in a C# Namespace
        /// </summary>
        /// <param name="appId">The appId</param>
        /// <returns>The modified appId</returns>
        public static string GetCSharpValidAppId(string appId)
        {
            return appId.Replace('-', '_').ToLower();
        }
    }
}
