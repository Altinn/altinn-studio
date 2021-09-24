import * as React from 'react'
import { collator } from './Editor';

type Props = {
  data: {id:string}[],
  addNewId:(id:string)=>void
}

const validIdRegex = /^[a-zA-Z][a-zA-ZæøåÆØÅ1-9.,-]+$/

export default function NewId({data, addNewId}:Props){
  const [id, setId] = React.useState("");
  const [error, setError] = React.useState<string|undefined>()
  const changeHandler = ((e:React.ChangeEvent<HTMLInputElement>)=>{
    setId(e.target.value);
    if(error) setError(undefined)
  })
  const invalidId = id.length < 3 || !validIdRegex.test(id) || data.some(m=>collator.compare(m.id, id) === 0)
  const submitHandler = ()=>{
    debugger;
    if(!invalidId){
      addNewId(id)
      setId("")
    }
  }
  return <div>
    <strong>Legg til ny id</strong> (flere IDer kan separeres med komma)
    <input type="text" value={id} onChange={changeHandler}/>
    <input type="button" value="legg til id" onClick={submitHandler} disabled={invalidId}/>
  </div>
}