namespace Altinn.App.Core.EFormidling.Implementation
{
    /// <summary>
    /// Exception thrown when Eformidling is unable to process the message delivered to
    /// the integration point.
    /// </summary>
    [Serializable]
    public class EformidlingDeliveryException : Exception
    {
        ///<inheritDoc/>
        public EformidlingDeliveryException()
        {
        }

        ///<inheritDoc/>
        public EformidlingDeliveryException(string message)
            : base(message)
        {
        }

        ///<inheritDoc/>
        public EformidlingDeliveryException(string message, Exception inner)
            : base(message, inner)
        {
        }

        ///<inheritDoc/>
        protected EformidlingDeliveryException(System.Runtime.Serialization.SerializationInfo serializationInfo, System.Runtime.Serialization.StreamingContext streamingContext)
            : base(serializationInfo, streamingContext)
        {
        }
    }
}
