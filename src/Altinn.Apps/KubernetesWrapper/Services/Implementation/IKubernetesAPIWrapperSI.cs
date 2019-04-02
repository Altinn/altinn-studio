using KubernetesWrapper.Services.Interfaces;
using k8s;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace KubernetesWrapper.Services.Implementation
{
    public class IKubernetesAPIWrapperSI : IKubernetesAPIWrapper
    {
        private Kubernetes client;
        public IKubernetesAPIWrapperSI()
        {
            var config = KubernetesClientConfiguration.InClusterConfig();
            client = new Kubernetes(config);
        }

        async Task<IList<k8s.Models.V1Pod>> IKubernetesAPIWrapper.GetAllPods()
        {
            var list = await client.ListNamespacedPodAsync("default");
            return list.Items;
        }

        IList<string> IKubernetesAPIWrapper.GetDummyData()
        {
            List<string> list = new List<string>();
            list.Add("value1");
            list.Add("value2");
            return list;
        }
    }
}
