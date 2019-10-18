namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface describing the services exposed by the platform
    /// </summary>
    public interface IPlatformServices
    {
        /// <summary>
        /// The access to register through platform services
        /// </summary>
        IRegister Register { get; }

        /// <summary>
        /// The access to profile through platform services
        /// </summary>
        IProfile Profile { get; }
    }
}
