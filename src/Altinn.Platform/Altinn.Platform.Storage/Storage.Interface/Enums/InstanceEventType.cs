namespace Altinn.Platform.Storage.Interface.Enums
{
    /// <summary>
    /// Represents a set of different events that can occur for an instance
    /// </summary>
    public enum InstanceEventType
    {
        /// <summary>
        /// Unkown instance event.
        /// </summary>
        None,

        /// <summary>
        /// Instance created event.
        /// </summary>
        Created,

        /// <summary>
        /// Instance saved event.
        /// </summary>
        Saved,

        /// <summary>
        /// Instance submited event.
        /// </summary>
        Submited,

        /// <summary>
        /// Instance deleted event.
        /// </summary>
        Deleted,

        /// <summary>
        /// Instance deleted event.
        /// </summary>
        Undeleted,

        /// <summary>
        /// A stakeholder has confirmed that they consider the instance as complete.
        /// </summary>
        ConfirmedComplete,

        /// <summary>
        /// Instance substatus updated event.
        /// </summary>
        SubstatusUpdated,

        /// <summary>
        /// Instance process start event.
        /// </summary>
        process_StartEvent,

        /// <summary>
        /// Instance process end event.
        /// </summary>
        process_EndEvent,

        /// <summary>
        /// Instance process task started event.
        /// </summary>
        process_StartTask,

        /// <summary>
        /// Instance process task ended event.
        /// </summary>
        process_EndTask
    }
}
