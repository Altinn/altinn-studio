using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.Ttd.Issue5740
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class PageOrder: IPageOrder
    {
        public async Task<List<string>> GetPageOrder(
            AppIdentifier appIdentifier, 
            InstanceIdentifier instanceIdentifier, 
            string layoutSetId,
            string currentPage, 
            string dataTypeId, 
            object formData)
        {
            List<string> pageOrder = new List<string> { "Side4", "Side2", "Side1", "Side3" };
            Skjema skjema = (Skjema)formData;

            pageOrder.Add(skjema.Skjemanummer.ToString());
            await Task.CompletedTask;
            return pageOrder;
        }
    }
}
