using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.logic.PageOrder
{
    public class PageOrder : IPageOrder
    {
        private readonly IAppResources _appResources;

        public PageOrder(IAppResources appResources)
        {
            _appResources = appResources;
        }

        public async Task<List<string>> GetPageOrder(AppIdentifier appIdentifier, InstanceIdentifier instanceIdentifier, string layoutSetId, string currentPage, string dataTypeId, object formData)
        {
            List<string> pageOrder = new List<string>();

            if (string.IsNullOrEmpty(layoutSetId))
            {
                pageOrder = _appResources.GetLayoutSettings().Pages.Order;
            }
            else
            {
                pageOrder = _appResources.GetLayoutSettingsForSet(layoutSetId).Pages.Order;
            }
            if (formData.GetType() == typeof(NestedGroup))
            {
                UpdatePageOrder(pageOrder, (NestedGroup)formData);
            }
            return pageOrder;
        }

        private void UpdatePageOrder(List<string> pageOrder, NestedGroup formdata)
        {
            var newValue = formdata?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788?.FirstOrDefault()?.SkattemeldingEndringEtterFristNyttBelopdatadef37132?.value;
            if (newValue.HasValue && newValue > 10)
            {
                pageOrder.Remove("hide");
            }
        }
    }
}
