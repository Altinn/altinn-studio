using Altinn.App.Core.Models;
using Altinn.App.Models;

namespace Altinn.App.Options
{
    public class PersonListProvider : IDataListProvider
    {
        public string Id { get; set; } = "people";

        public Task<DataList> GetDataListAsync(
            string? language,
            Dictionary<string, string> keyValuePairs
        )
        {
            string? search = "";
            keyValuePairs.TryGetValue("search", out search);

            int start = 0;
            int count = 10;
            if (
                keyValuePairs.TryGetValue("size", out var size)
                && keyValuePairs.TryGetValue("page", out var page)
            )
            {
                start = int.Parse(size) * int.Parse(page);
                count = int.Parse(size);
            }

            List<PersonEntry> items = new List<PersonEntry>();

            items.Add(new PersonEntry("Caroline", "28", "Utvikler"));
            items.Add(new PersonEntry("Kåre", "37", "Sykepleier"));
            items.Add(new PersonEntry("Johanne", "27", "Utvikler"));
            items.Add(new PersonEntry("Kari", "56", "Snekker"));
            items.Add(new PersonEntry("Petter", "19", "Personlig trener"));
            items.Add(new PersonEntry("Hans", "80", "Pensjonist"));
            items.Add(new PersonEntry("Siri", "28", "UX designer"));
            items.Add(new PersonEntry("Tiril", "40", "Arkitekt"));
            items.Add(new PersonEntry("Karl", "49", "Skuespiller"));
            items.Add(new PersonEntry("Mette", "33", "Artist"));

            if (!String.IsNullOrEmpty(search))
            {
                var s = search.ToLower();
                items = items
                    .Where(o =>
                    {
                        var n = o.Name.ToLower();
                        var a = o.Age.ToString();
                        var p = o.Profession.ToLower();

                        return n.Contains(s) || a.Contains(s) || p.Contains(s);
                    })
                    .ToList();
            }

            if (keyValuePairs.TryGetValue("sortDirection", out var sortDirection))
            {
                if (sortDirection == "asc")
                {
                    items = items.OrderBy(o => o.Age).ToList();
                }
                else if (sortDirection == "desc")
                {
                    items = items.OrderBy(o => o.Age).ToList();
                    items.Reverse();
                }
            }

            DataListMetadata appListsMetaData = new DataListMetadata()
            {
                TotaltItemsCount = items.Count
            };

            List<object> objectList = new List<object>();
            items.ForEach(o =>
                objectList.Add(
                    new ListItem
                    {
                        Name = o.Name,
                        Age = o.Age,
                        Profession = o.Profession
                    }
                )
            );

            int boundedCount = start + count > items.Count ? items.Count - start : count;
            return Task.FromResult(
                new DataList
                {
                    ListItems = objectList.GetRange(start, boundedCount),
                    _metaData = appListsMetaData
                }
            );
        }

        /// <summary>
        /// Seed data for the people list. Every field is required, so the compiler
        /// can see that the values are present without any assertion at the use site.
        /// </summary>
        private sealed record PersonEntry(string Name, string Age, string Profession);
    }
}
