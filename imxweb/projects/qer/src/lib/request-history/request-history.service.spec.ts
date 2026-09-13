import { QerApiService } from '../qer-api-client.service';
import { ItshopRequestService } from '../itshop/itshop-request.service';
import { RequestHistoryService } from './request-history.service';

describe('RequestHistoryService', () => {
  function createService() {
    const portalItshopRequests = {
      Get: jasmine.createSpy('Get').and.returnValue(Promise.resolve({ Data: [], totalCount: 0 })),
      GetSchema: jasmine.createSpy('GetSchema').and.returnValue({}),
    };
    const qerClient = {
      typedClient: {
        PortalItshopRequests: portalItshopRequests,
      },
    } as unknown as QerApiService;
    const itshopRequest = {
      createParameterColumns: jasmine.createSpy('createParameterColumns').and.returnValue([]),
    } as unknown as ItshopRequestService;

    return {
      service: new RequestHistoryService(qerClient, itshopRequest),
      portalItshopRequests,
    };
  }

  it('requests request history data with the supplied parameters', async () => {
    const { service, portalItshopRequests } = createService();

    await service.getRequests('uid-user', { PageSize: 1000, StartIndex: 0, person: '7' });

    expect(portalItshopRequests.Get).toHaveBeenCalledWith(
      { PageSize: 1000, StartIndex: 0, person: '7' },
      { signal: service.abortController.signal }
    );
  });

  it('requests full data for a single request detail load', async () => {
    const { service, portalItshopRequests } = createService();

    await service.getRequest('uid-user', 'uid-pwo', service.abortController.signal);

    expect(portalItshopRequests.Get).toHaveBeenCalledWith(
      { uidpwo: 'uid-pwo', PageSize: 1, StartIndex: 0 },
      { signal: service.abortController.signal }
    );
  });

  it('uses the provided abort signal for a single request detail load', async () => {
    const { service, portalItshopRequests } = createService();
    const abortController = new AbortController();

    await service.getRequest('uid-user', 'uid-pwo', abortController.signal);

    expect(portalItshopRequests.Get).toHaveBeenCalledWith(
      { uidpwo: 'uid-pwo', PageSize: 1, StartIndex: 0 },
      { signal: abortController.signal }
    );
  });

  it('returns undefined when a single request detail load has no collection', async () => {
    const { service, portalItshopRequests } = createService();
    portalItshopRequests.Get.and.returnValue(Promise.resolve(undefined));

    const request = await service.getRequest('uid-user', 'uid-pwo', service.abortController.signal);

    expect(request).toBeUndefined();
  });
});