using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Extensions;

/// <summary>
/// Extension methods for <see cref="InstanceEvent"/>.
/// </summary>
public static class InstanceEventExtensions
{
    /// <summary>
    /// Copies the values of the original <see cref="InstanceEvent"/> to a new instance.
    /// </summary>
    /// <param name="original">The original <see cref="InstanceEvent"/>.</param>
    /// <returns>New object with copies of values form original</returns>
    public static InstanceEvent CopyValues(this InstanceEvent original)
    {
        return new InstanceEvent
        {
            Created = original.Created,
            DataId = original.DataId,
            EventType = original.EventType,
            Id = original.Id,
            InstanceId = original.InstanceId,
            InstanceOwnerPartyId = original.InstanceOwnerPartyId,
            ProcessInfo = new ProcessState
            {
                Started = original.ProcessInfo?.Started,
                CurrentTask = new ProcessElementInfo
                {
                    Flow = original.ProcessInfo?.CurrentTask?.Flow,
                    AltinnTaskType = original.ProcessInfo?.CurrentTask?.AltinnTaskType,
                    ElementId = original.ProcessInfo?.CurrentTask?.ElementId,
                    Name = original.ProcessInfo?.CurrentTask?.Name,
                    Started = original.ProcessInfo?.CurrentTask?.Started,
                    Ended = original.ProcessInfo?.CurrentTask?.Ended,
#pragma warning disable CS0618 // Type or member is obsolete
                    Validated = new ValidationStatus
                    {
                        CanCompleteTask = original.ProcessInfo?.CurrentTask?.Validated?.CanCompleteTask ?? false,
                        Timestamp = original.ProcessInfo?.CurrentTask?.Validated?.Timestamp,
                    },
#pragma warning restore CS0618 // Type or member is obsolete
                },

                StartEvent = original.ProcessInfo?.StartEvent,
            },
            User = new PlatformUser
            {
                AuthenticationLevel = original.User.AuthenticationLevel,
                EndUserSystemId = original.User.EndUserSystemId,
                OrgId = original.User.OrgId,
                UserId = original.User.UserId,
                NationalIdentityNumber = original.User?.NationalIdentityNumber,
                SystemUserId = original.User?.SystemUserId,
                SystemUserOwnerOrgNo = original.User?.SystemUserOwnerOrgNo,
                SystemUserName = original.User?.SystemUserName,
            },
        };
    }
}
