import React from 'react';
import { Outlet } from 'react-router-dom';

export const OlsenbandenPage = () => {
  return (
    <div>
      <h1>Dette er OlsenbandenPage /m Outlet for wrap </h1>
      <p> Her er neste steg å velge REPO under org = Olsenbanden</p>
      <p>
        {' '}
        Men om org = LandbruksDept, og deres ressurs-repo har 52 ressurser, hver med 1 ressurs-json
        og 1 ressurs-policy, så er jo valget implisitt. Om vi velger rett datastruktur. Som vi nå
        snart bør gjøre.
      </p>
      <Outlet />
    </div>
  );
};
