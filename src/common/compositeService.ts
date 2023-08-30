import GmxV1Service from "../exchanges/gmxv1";
import SynthetixV2Service from "../exchanges/synthetixv2";
import { Network, Market, ExtendedMarket, OpenMarkets } from "../interface";
import { timer } from "execution-time-decorators";

export type OpenMarket = Record<string, Array<ExtendedMarket & Network>>;

export default class CompositeService {
  private synService: SynthetixV2Service;
  private gmxService: GmxV1Service;

  constructor(_synService: SynthetixV2Service, _gmxService: GmxV1Service) {
    this.synService = _synService;
    this.gmxService = _gmxService;
  }

  async getOpenMarkets(): Promise<OpenMarkets> {
    let openMarkets: OpenMarkets = {};

    const synV2Network = this.synService.supportedNetworks()[0];
    const synV2Markets = await this.synService.supportedMarkets(synV2Network);

    synV2Markets.forEach((m) => {
      let openIdentifier = m.asset!.replace("s", "").concat("-USD");
      let marketData = {
        ...m,
        ...synV2Network,
        openMarketIdentifier: openIdentifier,
      };
      openMarkets[openIdentifier] = [marketData];
    });

    const gmxV1Network = this.gmxService.supportedNetworks()[0];
    const gmxV1Markets = await this.gmxService.supportedMarkets(gmxV1Network);

    gmxV1Markets.forEach((m) => {
      let openIdentifier = m.asset!.concat("-USD");
      let marketData = {
        ...m,
        ...gmxV1Network,
        openMarketIdentifier: openIdentifier,
      };

      if (openMarkets[openIdentifier].length) {
        openMarkets[openIdentifier].push(marketData);
      } else {
        openMarkets[openIdentifier] = [marketData];
      }
    });

    return openMarkets;
  }
}
