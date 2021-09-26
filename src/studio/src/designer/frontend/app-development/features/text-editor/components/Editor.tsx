import * as React from "react";
import { CultureData } from "../hooks/useLanguages";
import NewId from "./NewId";
import Row from "./Row";

type Props = {
  cultureData: CultureData,
  data: {
    id: string;
    orig: {
      [languageCode: string]: string;
    };
    edit: {
      [languageCode: string]: string;
    };
  }[];
  updateCell: (e: React.ChangeEvent<HTMLInputElement>) => void,
  addNewId: (newId: string) => void,
  deleteId: (e: React.MouseEvent<HTMLInputElement>) => void,
  save: () => void
};

// Sort using norwegian sorting rules
export const collator = new Intl.Collator("no", { caseFirst: "false", sensitivity: "base" });

export default function Editor({ cultureData, data, updateCell, addNewId, deleteId, save }: Props,) {
  const [filter, setFilter] = React.useState("")

  // First filtler with only prefix
  const regex = new RegExp(`^${filter}`, "i");
  let filtered = filter ? data.filter(row => regex.test(row.id)) : data
  if (filtered.length == 0) {
    // Search full content if no prefix match is found
    const regex = new RegExp(filter, "i");
    filtered = data.filter(row => regex.test(row.id))
  }

  return (
    <div>
      <input type="search" value={filter} placeholder="Filtrer nøkler" onChange={e => setFilter(e.target.value)} />
      {/* Consider using windowing to improve performance */}
      {filtered.map(row =>
        <Row
          {...row}
          cultureData={cultureData}
          key={row.id}
          updateCell={updateCell}
          deleteId={deleteId} />
      )}
      <NewId addNewId={addNewId} data={data} />
      <div>
        <button onClick={save}>Lagre</button>
      </div>
      {/* <pre>
        resources:
        {JSON.stringify(resources, null, 4)}
        data:
        {JSON.stringify(data, null, 4)}
      </pre>  */}
    </div>
  );
}

