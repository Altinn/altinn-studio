namespace AltinnCore.ServiceLibrary.Services.Interfaces
{
    /// <summary>
    /// Interface for register functionality
    /// </summary>
    public interface IRegister
    {
        /// <summary>
        /// The access to dsf methods through register
        /// </summary>
        IDSF DSF { get; }

        /// <summary>
        /// The access to er methods through register
        /// </summary>
        IER ER { get; }
    }
}
