import * as React from "react";
import { Languages } from "../api";
import { CultureData } from "../hooks/useLanguages";

type Props = {
  cultureData: CultureData,
  addLanguage: (language: Languages) => void,
  removeLanguage: (language: Languages) => void 
};

export default function Header({ cultureData, addLanguage, removeLanguage }: Props): JSX.Element {
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  return (
    <div>
      <ul className="nav nav-tabs my-2">
        {cultureData.active.map((culture) => (
          <li key={culture.id} className="nav-item">
            <a className="nav-link">{culture.name}</a><button onClick={()=>{removeLanguage(culture.id)}}>x</button>
          </li>
        ))}
        <li className="nav-item" key="new">
          <button className="nav-link" onClick={() => { setModalOpen(!modalOpen) }}>
            <i
              className="fas fa-fw fa-plus"
              style={{ color: "green" }}
              aria-hidden="true"
            ></i>
            Legg til språk
          </button>
          {modalOpen ?
            <select defaultValue="-" onChange={e => { addLanguage(e.target.value as Languages) }}>
              <option value="nn">Nynorsk</option>
              <option value="en">Engelsk</option>
              <option value="-">-------</option>
              {cultureData.cultures.map(culture => <option key={culture.id} value={culture.id}>{culture.name}</option>)}
            </select>
            : null}
        </li>
      </ul>
    </div>
  );
}
