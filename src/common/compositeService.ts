import GmxV1Service from "../exchanges/gmxv1";
import SynthetixV2Service from "../exchanges/synthetixv2";
import { Network, Market, ExtendedMarket } from "../interface";

export type OpenMarket = Record<string, Array<ExtendedMarket & Network>>;

export default class CompositeService {
  private synService: SynthetixV2Service;
  private gmxService: GmxV1Service;

  constructor(_synService: SynthetixV2Service, _gmxService: GmxV1Service) {
    this.synService = _synService;
    this.gmxService = _gmxService;
  }

  // TODO: Complete for gmx
  // async getOpenMarketsAlt(): Promise<OpenMarket[]> {
  //   const synNetwork = this.synService.supportedNetworks()[0];
  //   const synMarkets = await this.synService.supportedMarkets(synNetwork);

  //   const openMarkets: OpenMarket[] = [];

  //   synMarkets.forEach((m) => {
  //     let openIdentifier = m.asset!.replace("s", "").concat("/USD");
  //     let marketRecode = {
  //       [openIdentifier]: [
  //         {
  //           ...m,
  //           ...synNetwork,
  //         },
  //       ],
  //     };
  //     openMarkets.push(marketRecode);
  //   });

  //   // gmx code

  //   return openMarkets;
  // }

  async getOpenMarkets() {
    const synNetwork = this.synService.supportedNetworks()[0];
    const synMarkets = await this.synService.supportedMarkets(synNetwork);

    let openMarkets: { [index: string]: any } = {};

    synMarkets.forEach((m) => {
      let openIdentifier = m.asset!.replace("s", "").concat("/USD");
      let marketData = {
        ...m,
        ...synNetwork,
        openMarketIdentifier: openIdentifier,
      };
      openMarkets[openIdentifier] = [marketData];
    });

    // gmx code
    return openMarkets;
  }
}
