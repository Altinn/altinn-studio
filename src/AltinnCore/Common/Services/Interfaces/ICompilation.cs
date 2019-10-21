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
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="startAppFlag">Flag to determine if the app should run/re-run.</param>
        /// <param name="outputLocation">The directory where the resulting assembly should be saved.</param>
        /// <param name="loadAssemblyContext">Defines if compilation should load assembly in to context.</param>
        /// <returns>The assembly name.</returns>
        CodeCompilationResult CreateServiceAssembly(string org, string app, bool startAppFlag, string outputLocation = null, bool loadAssemblyContext = true);

        /// <summary>
        /// Creates a zip file containing all files necessary for executing an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="startAppFlag">Flag to determine if the app should run/re-run.</param>
        /// <returns>Was the package creation successful.</returns>
        bool CreateServicePackage(string org, string app, bool startAppFlag);
    }
}
