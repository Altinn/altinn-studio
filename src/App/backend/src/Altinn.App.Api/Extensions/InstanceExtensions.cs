using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Extensions;

internal static class InstanceExtensions
{
    /// <summary>
    /// Returns a new instance object with <see cref="Instance.Data"/> filtered to contain only accessible data elements.
    /// A shallow copy is made of the instance object, leaving the original instance unchanged
    /// </summary>
    public static async Task<Instance> WithOnlyAccessibleDataElements(
        this Instance instance,
        IDataElementAccessChecker dataElementAccessChecker
    )
    {
        List<DataElement> filteredDataElements = [];

        foreach (var dataElement in instance.Data)
        {
            if (await dataElementAccessChecker.GetReaderProblem(instance, dataElement) is null)
            {
                filteredDataElements.Add(dataElement);
            }
        }

        return new Instance
        {
            Id = instance.Id,
            AppId = instance.AppId,
            CompleteConfirmations = instance.CompleteConfirmations,
            Created = instance.Created,
            CreatedBy = instance.CreatedBy,
            Data = filteredDataElements,
            DataValues = instance.DataValues,
            DueBefore = instance.DueBefore,
            InstanceOwner = instance.InstanceOwner,
            LastChanged = instance.LastChanged,
            LastChangedBy = instance.LastChangedBy,
            Org = instance.Org,
            PresentationTexts = instance.PresentationTexts,
            Process = instance.Process,
            SelfLinks = instance.SelfLinks,
            Status = instance.Status,
            VisibleAfter = instance.VisibleAfter,
        };
    }
}
