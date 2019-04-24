using System.Threading.Tasks;
using System;
using AltinnCore.ServiceLibrary;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Common.Models;

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
        /// <param name="compilation"></param>
        /// <param name="identifier"></param>
        /// <returns></returns>
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
