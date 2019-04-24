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
    }
}
