import PerennialV2Service from "./src/exchanges/perennialv2";

async function main() {
    const service = new PerennialV2Service()
    console.log(await service.supportedMarkets(undefined))
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});