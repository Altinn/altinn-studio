using AltinnCore.ServiceLibrary.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for assembly compilation
    /// </summary>
    public interface ICompilation
    {
        /// <summary>
        /// Creates the assembly for a service based on service ID.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="startServiceFlag">Flag to determine if the service should run/re-run.</param>
        /// <param name="outputLocation">The directory where the resulting assembly should be saved.</param>
        /// <param name="loadAssemblyContext">Defines if compilation should load assembly in to context.</param>
        /// <returns>The assembly name.</returns>
        CodeCompilationResult CreateServiceAssembly(string org, string service, bool startServiceFlag, string outputLocation = null, bool loadAssemblyContext = true);

        /// <summary>
        /// Creates a zip-file containing all files necessary for executing a service.
        /// </summary>
        /// <param name="org">The organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="startServiceFlag">Flag to determine if the service should run/re-run.</param>
        /// <returns>Was the package creation successful.</returns>
        bool CreateServicePackage(string org, string service, bool startServiceFlag);
    }
}
