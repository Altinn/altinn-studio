// import { redirect } from 'react-router-dom';
//
// import 'whatwg-fetch';
//
// import { GlobalData } from 'nextsrc/core/globalData';
// import { InstanceApi } from 'nextsrc/features/instantiate/api';
// import { entryRedirectLoader } from 'nextsrc/features/instantiate/loaders/entryRedirectLoader';
// import { instantiateRoutes } from 'nextsrc/features/instantiate/routes';
//
// // import { InstantiateRoutes } from 'nextsrc/features/instantiate/routes';
// import type { IInstance } from 'src/types/shared';
//
// jest.mock('react-router-dom', () => ({
//   redirect: jest.fn((url: string) => ({ redirectUrl: url })),
// }));
//
// jest.mock('../api');
//
// function mockEntryShow(show: string) {
//   Object.defineProperty(GlobalData, 'applicationMetadata', {
//     get: () => ({ onEntry: { show } }),
//     configurable: true,
//   });
// }
//
// function mockUserProfile(profile?: { partyId: number }) {
//   Object.defineProperty(GlobalData, 'userProfile', {
//     get: () => profile,
//     configurable: true,
//   });
// }
//
// const mockedRedirect = jest.mocked(redirect);
//
// describe('entryRedirectLoader', () => {
//   afterEach(() => jest.clearAllMocks());
//
//   it('should redirect to instance selection when show is "select-instance"', async () => {
//     mockEntryShow('select-instance');
//
//     await entryRedirectLoader();
//
//     expect(mockedRedirect).toHaveBeenCalledWith(instantiateRoutes.instanceSelection);
//   });
//
//   it('should create instance and redirect when show is "new-instance"', async () => {
//     mockEntryShow('new-instance');
//     mockUserProfile({ partyId: 12345 });
//
//     const instance = { id: '12345/abc-guid' } as IInstance;
//     jest.spyOn(InstanceApi, 'create').mockResolvedValue(instance);
//
//     await entryRedirectLoader();
//
//     expect(InstanceApi.create).toHaveBeenCalledWith(12345);
//     expect(mockedRedirect).toHaveBeenCalledWith(instantiateRoutes.forInstance(instance));
//   });
//
//   it('should throw unauthorized when show is "new-instance" and no user profile', async () => {
//     mockEntryShow('new-instance');
//     mockUserProfile(undefined);
//
//     await expect(entryRedirectLoader()).rejects.toEqual(expect.objectContaining({ status: 401 }));
//   });
//
//   it('should redirect to stateless when show is not a known action', async () => {
//     mockEntryShow('something-else');
//
//     await entryRedirectLoader();
//
//     expect(mockedRedirect).toHaveBeenCalledWith(instantiateRoutes.stateless);
//   });
// });
