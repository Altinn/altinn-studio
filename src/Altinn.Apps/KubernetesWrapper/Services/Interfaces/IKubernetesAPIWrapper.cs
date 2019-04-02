using System.Collections.Generic;
using System.Threading.Tasks;

namespace KubernetesWrapper.Services.Interfaces
{
    public interface IKubernetesAPIWrapper
    {
        Task<IList<k8s.Models.V1Pod>> GetAllPods();

        IList<string> GetDummyData();
    }
}
