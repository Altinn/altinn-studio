import  * as React from "react";
import { getResourcesResponse, saveResourcesRequest } from "../api";
import useEditArray from "../hooks/useEditArray";
import { CultureData } from "../hooks/useLanguages";
import NewId from "./NewId";
import Row from "./Row";

type Props = { cultureData: CultureData, resources: getResourcesResponse, doPost: (data: saveResourcesRequest) => Promise<void> };

// Sort using norwegian sorting rules
export const collator = new Intl.Collator("no", {caseFirst:"false", sensitivity:"base"});

export default function Editor({ cultureData, resources, doPost }: Props, ) {
  const [filter, setFilter] = React.useState("")

  const { data, updateCell, addNewId, deleteId, state: editArrayState} = useEditArray(resources)

  // First filtler with only prefix
  const regex = new RegExp(`^${filter}`, "i");
  let filtered = filter?data.filter(row=>regex.test(row.id)): data
  if(filtered.length == 0){
    // Search full content if no prefix match is found
    const regex = new RegExp(filter, "i");
    filtered = data.filter(row=>regex.test(row.id))
  }

  return (
    <div>
      <input type="search" value={filter} placeholder="Filtrer nøkler" onChange={e=>setFilter(e.target.value)}/>
      {/* Consider using windowing to improve performance */}
      {filtered.map(row=>
        <Row
          {...row}
          cultureData={cultureData}
          key={row.id}
          updateCell={updateCell}
          deleteId={deleteId} />
      )}
      <NewId addNewId={addNewId} data={data}/>
      <div>
        <button onClick={()=>{doPost(editArrayState)}}>Lagre</button>
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

