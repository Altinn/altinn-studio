import React, { useEffect, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { HeaderContext } from 'app-shared/navigation/main-header/Header';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import AppHeader from 'app-shared/navigation/main-header/Header';

import { userHasAccessToSelectedContext } from '../../utils/userUtils';
import { useOrganizationsQuery } from '../../hooks/useOrganizationQueries';
import { useUserQuery } from '../../hooks/useUserQueries';
import { useSelectedContext } from '../../hooks/useSelectedContext';

export const PageLayout = () => {
  console.log("Er i PageLayout component før krasj"); // OK blir skrevet ut

  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();

  const selectedContext = useSelectedContext();
  console.log(selectedContext); // fikk ut "self" i resource6 versjon, og i res7
  
  const navigate = useNavigate();

  

  useEffect(() => {
    if (
      organizations &&
      !userHasAccessToSelectedContext({ selectedContext, orgs: organizations })
    ) {
      navigate("/");
    }
  }, [organizations, selectedContext, user.login, navigate]);

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user]
  );

  console.log("Dette er headerContextValue = ");
  console.log(headerContextValue); // får ut user og 2 orgs i resource7 OK
  
  // fikk ut avatar_url (etc) 
  // user = email:"zzz@dilldall.com",
  // full_name="", id:3, login: "studiobruker2"

  // OK, i render #2, får vi vel ut et objekt for selectableOrgs: Array (2)
  // der 0´te objekt er id:5, username:"olsenbanden"
  // og der 1´ste objekt er id: 2, username: "torgeirorg3"
  // ---> ser ut som om PageLayout komponenten nå har tilgang til context...
  // Om man prøver velge en av disse organisasjonene fra
  // Avatar-ikon Meny oppe til høyre, f.eks. olsenbanden, så settes URL
  // til /resourceadm/olsenbanden/  ---> dette blir plukket opp av Router

  return (
    <>
      <HeaderContext.Provider value={headerContextValue}>
        <AppHeader />
      </HeaderContext.Provider>
      <Outlet />
    </>
  );
};
