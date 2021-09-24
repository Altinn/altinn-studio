import * as React from 'react'
import { CultureData } from '../hooks/useLanguages'

type Props = {
  cultureData: CultureData,
  id: string
  orig: {[langCode:string]:string},
  edit: {[langCode:string]:string},
  updateCell: (e:React.ChangeEvent<HTMLInputElement>)=>void
  deleteId: (e:React.MouseEvent<HTMLInputElement>)=>void
}
function Row({cultureData, id, orig, edit, updateCell, deleteId}:Props){
  const data = {...orig, ...edit}
  return <div>
    <strong>{id}</strong>
    {cultureData.active.map(lang=>
      <React.Fragment key={lang.id}>
        {lang.name}
        <input type="text" onChange={updateCell} lang={lang.id} data-id={id} value={data[lang.id] || ""} />
      </React.Fragment>
    )}
    <input type="button" onClick={deleteId} data-id={id} value="slett" />
  </div>
}

// React.memo doesn't work well because data is a new object on each render for edited rows
export default React.memo(Row)