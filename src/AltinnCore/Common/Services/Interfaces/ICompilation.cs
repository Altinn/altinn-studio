using AltinnCore.ServiceLibrary.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for assembly compilation
    /// </summary>
    public interface ICompilation
    {
        /// <summary>
        /// Creates the assembly for an app.
        /// </summary>
        /// <param name="org">The organisation code for the application owner</param>
        /// <param name="app">The application name</param>
        /// <param name="startServiceFlag">Flag to determine if the app should run/re-run.</param>
        /// <param name="outputLocation">The directory where the resulting assembly should be saved.</param>
        /// <param name="loadAssemblyContext">Defines if compilation should load assembly in to context.</param>
        /// <returns>The assembly name.</returns>
        CodeCompilationResult CreateServiceAssembly(string org, string app, bool startServiceFlag, string outputLocation = null, bool loadAssemblyContext = true);

        /// <summary>
        /// Creates a zip-file containing all files necessary for executing an app.
        /// </summary>
        /// <param name="org">The organisation code for the application owner</param>
        /// <param name="app">The application name</param>
        /// <param name="startServiceFlag">Flag to determine if the app should run/re-run.</param>
        /// <returns>Was the package creation successful.</returns>
        bool CreateServicePackage(string org, string app, bool startServiceFlag);
    }
}
