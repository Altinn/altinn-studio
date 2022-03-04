namespace Altinn.Platform.Storage.Interface.Enums
{
    /// <summary>
    /// Represents a set of different events that can occur for an instance
    /// </summary>
    public enum InstanceEventType
    {
        /// <summary>
        /// Unknown instance event.
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
#pragma warning disable SA1300 // Element should begin with upper-case letter
        process_StartEvent,
#pragma warning restore SA1300 // Element should begin with upper-case letter

        /// <summary>
        /// Instance process end event.
        /// </summary>
#pragma warning disable SA1300 // Element should begin with upper-case letter
        process_EndEvent,
#pragma warning restore SA1300 // Element should begin with upper-case letter

        /// <summary>
        /// Instance process task started event.
        /// </summary>
#pragma warning disable SA1300 // Element should begin with upper-case letter
        process_StartTask,
#pragma warning restore SA1300 // Element should begin with upper-case letter

        /// <summary>
        /// Instance process task ended event.
        /// </summary>
#pragma warning disable SA1300 // Element should begin with upper-case letter
        process_EndTask,
#pragma warning restore SA1300 // Element should begin with upper-case letter

        /// <summary>
        /// Instance process task abandon event.
        /// </summary>
#pragma warning disable SA1300 // Element should begin with upper-case letter
        process_AbandonTask
#pragma warning restore SA1300 // Element should begin with upper-case letter
    }
}
