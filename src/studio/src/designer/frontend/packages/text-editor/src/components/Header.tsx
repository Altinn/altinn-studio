import * as React from "react";
import { CultureData } from "../hooks/useLanguages";

type Props = { cultureData: CultureData };

export default function Header({ cultureData }: Props): JSX.Element {
  return (
    <div>
      <ul className="nav nav-tabs my-2">
        {cultureData.active.map((culture) => (
          <li key={culture.id} className="nav-item">
            <a className="nav-link">{culture.name}</a>
          </li>
        ))}
        <li className="nav-item" key="new">
          <a className="nav-link">
            <i
              className="fas fa-fw fa-plus"
              style={{ color: "green" }}
              aria-hidden="true"
            ></i>
            Legg til språk
          </a>
        </li>
      </ul>
    </div>
  );
}
