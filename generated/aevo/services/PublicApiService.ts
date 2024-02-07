/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { account } from '../models/account';
import type { amount__swap_preview_response } from '../models/amount__swap_preview_response';
import type { amount_response } from '../models/amount_response';
import type { amount_step_response } from '../models/amount_step_response';
import type { apy_response } from '../models/apy_response';
import type { asks_response } from '../models/asks_response';
import type { asset_response } from '../models/asset_response';
import type { aum_liquid_response } from '../models/aum_liquid_response';
import type { aum_response } from '../models/aum_response';
import type { avg_price_response } from '../models/avg_price_response';
import type { base_amount } from '../models/base_amount';
import type { base_balance_response } from '../models/base_balance_response';
import type { base_capacity_response } from '../models/base_capacity_response';
import type { base_currency_response } from '../models/base_currency_response';
import type { bids_response } from '../models/bids_response';
import type { block_response } from '../models/block_response';
import type { calls_response } from '../models/calls_response';
import type { cap_response } from '../models/cap_response';
import type { checksum_response } from '../models/checksum_response';
import type { code_response } from '../models/code_response';
import type { collateral_asset } from '../models/collateral_asset';
import type { contract_price_currency_response } from '../models/contract_price_currency_response';
import type { contract_type_response } from '../models/contract_type_response';
import type { count_response } from '../models/count_response';
import type { country_response } from '../models/country_response';
import type { created_timestamp_response } from '../models/created_timestamp_response';
import type { daily_buy_volume_response } from '../models/daily_buy_volume_response';
import type { daily_sell_volume_response } from '../models/daily_sell_volume_response';
import type { daily_volume_contracts_response } from '../models/daily_volume_contracts_response';
import type { daily_volume_premium_response } from '../models/daily_volume_premium_response';
import type { daily_volume_response } from '../models/daily_volume_response';
import type { delta_response } from '../models/delta_response';
import type { email_auth_token } from '../models/email_auth_token';
import type { exchange_status_response } from '../models/exchange_status_response';
import type { expiry_response } from '../models/expiry_response';
import type { fee_rate_response } from '../models/fee_rate_response';
import type { fees_response } from '../models/fees_response';
import type { forward_price_response } from '../models/forward_price_response';
import type { funding_daily_avg_response } from '../models/funding_daily_avg_response';
import type { funding_history_response } from '../models/funding_history_response';
import type { funding_rate_response } from '../models/funding_rate_response';
import type { gamma_response } from '../models/gamma_response';
import type { history_response } from '../models/history_response';
import type { index_currency_response } from '../models/index_currency_response';
import type { index_daily_change_response } from '../models/index_daily_change_response';
import type { index_price_response } from '../models/index_price_response';
import type { instrument_id_response } from '../models/instrument_id_response';
import type { instrument_name_response } from '../models/instrument_name_response';
import type { instrument_type_response } from '../models/instrument_type_response';
import type { is_active_response } from '../models/is_active_response';
import type { is_buy } from '../models/is_buy';
import type { is_paused_response } from '../models/is_paused_response';
import type { is_referrable_response } from '../models/is_referrable_response';
import type { iv_response } from '../models/iv_response';
import type { last_updated_response } from '../models/last_updated_response';
import type { mark_daily_change_response } from '../models/mark_daily_change_response';
import type { mark_price_24h_ago_response } from '../models/mark_price_24h_ago_response';
import type { mark_price_response } from '../models/mark_price_response';
import type { max_leverage_response } from '../models/max_leverage_response';
import type { max_notional_value_response } from '../models/max_notional_value_response';
import type { max_order_value_response } from '../models/max_order_value_response';
import type { min_order_value_response } from '../models/min_order_value_response';
import type { name_response } from '../models/name_response';
import type { next_epoch_response } from '../models/next_epoch_response';
import type { next_funding_rate_timestamp_response } from '../models/next_funding_rate_timestamp_response';
import type { open_interest_response } from '../models/open_interest_response';
import type { option_type_response } from '../models/option_type_response';
import type { order_type_response } from '../models/order_type_response';
import type { pending_withdrawals_response } from '../models/pending_withdrawals_response';
import type { pps_response } from '../models/pps_response';
import type { pre_launch_response } from '../models/pre_launch_response';
import type { price__swap_preview_response } from '../models/price__swap_preview_response';
import type { price_response } from '../models/price_response';
import type { price_step_response } from '../models/price_step_response';
import type { product_volume_response } from '../models/product_volume_response';
import type { put_call_ratio_response } from '../models/put_call_ratio_response';
import type { puts_response } from '../models/puts_response';
import type { quote_amount } from '../models/quote_amount';
import type { quote_amount_response } from '../models/quote_amount_response';
import type { quote_asset_response } from '../models/quote_asset_response';
import type { quote_balance_response } from '../models/quote_balance_response';
import type { quote_capacity_response } from '../models/quote_capacity_response';
import type { referee_discount_response } from '../models/referee_discount_response';
import type { restricted_response } from '../models/restricted_response';
import type { rho_response } from '../models/rho_response';
import type { sequence_response } from '../models/sequence_response';
import type { settlement_price_response } from '../models/settlement_price_response';
import type { settlement_timestamp_response } from '../models/settlement_timestamp_response';
import type { side_response } from '../models/side_response';
import type { strike_response } from '../models/strike_response';
import type { success_response } from '../models/success_response';
import type { target_currency_response } from '../models/target_currency_response';
import type { target_volume_response } from '../models/target_volume_response';
import type { theta_response } from '../models/theta_response';
import type { ticker_id_response } from '../models/ticker_id_response';
import type { time_response } from '../models/time_response';
import type { timestamp_response } from '../models/timestamp_response';
import type { total_oi_response } from '../models/total_oi_response';
import type { total_response } from '../models/total_response';
import type { total_volume_contracts_response } from '../models/total_volume_contracts_response';
import type { total_volume_premium_response } from '../models/total_volume_premium_response';
import type { total_volume_response } from '../models/total_volume_response';
import type { trade_id_response } from '../models/trade_id_response';
import type { trade_status_response } from '../models/trade_status_response';
import type { type_response } from '../models/type_response';
import type { underlying_asset_response } from '../models/underlying_asset_response';
import type { username_response } from '../models/username_response';
import type { vega_response } from '../models/vega_response';
import type { volume_response } from '../models/volume_response';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class PublicApiService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * GET /assets
     * Returns the list of active underlying assets.
     * @returns asset_response List of underlying assets.
     * @throws ApiError
     */
    public getAssets(): CancelablePromise<Array<asset_response>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/assets',
            errors: {
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /expiries
     * Returns the expiry timestamps of derivatives of the given asset.
     * @param asset Name of underlying asset.
     * @returns expiry_response List of expiries.
     * @throws ApiError
     */
    public getExpiries(
        asset: string,
    ): CancelablePromise<Array<expiry_response>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/expiries',
            query: {
                'asset': asset,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /index
     * Returns the current index price of the given asset.
     * @param asset Name of underlying asset.
     * @returns any Index price of the asset.
     * @throws ApiError
     */
    public getIndex(
        asset: string,
    ): CancelablePromise<{
        price: price_response;
        timestamp: timestamp_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/index',
            query: {
                'asset': asset,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /index-history
     * Returns the historical index price for a given asset.
     * @param asset Name of underlying asset.
     * @param resolution Interval between entries in seconds. Must be a multiple of 30. Defaults to `30`
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @returns any Array of historical index price of the asset.
     * @throws ApiError
     */
    public getIndexHistory(
        asset: string,
        resolution?: number,
        startTime?: number,
        endTime?: number,
    ): CancelablePromise<{
        /**
         * List of [timestamp, price]. Timestamp is in UNIX nanoseconds.
         */
        history?: Array<history_response>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/index-history',
            query: {
                'asset': asset,
                'resolution': resolution,
                'start_time': startTime,
                'end_time': endTime,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /mark-history
     * Returns the historical mark prices for a given instrument.
     * @param instrumentName Instrument name.
     * @param resolution Interval between entries in seconds. Must be a multiple of 30. Defaults to `30`
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @returns any Array of historical mark prices for the given instrument.
     * @throws ApiError
     */
    public getMarkHistory(
        instrumentName: string,
        resolution?: number,
        limit?: number,
        startTime?: number,
        endTime?: number,
    ): CancelablePromise<{
        /**
         * List of [timestamp, price]. Timestamp is in UNIX nanoseconds.
         */
        history?: Array<history_response>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/mark-history',
            query: {
                'instrument_name': instrumentName,
                'resolution': resolution,
                'limit': limit,
                'start_time': startTime,
                'end_time': endTime,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /settlement-history
     * Returns the historical settlement prices for a given asset.
     * @param asset Name of underlying asset.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @returns any Array of historical settlement price of the asset.
     * @throws ApiError
     */
    public getSettlementHistory(
        asset?: string,
        startTime?: number,
        endTime?: number,
        limit?: number,
    ): CancelablePromise<Array<{
        asset: asset_response;
        expiry: expiry_response;
        settlement_price: settlement_price_response;
        settlement_timestamp: settlement_timestamp_response;
    }>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/settlement-history',
            query: {
                'asset': asset,
                'start_time': startTime,
                'end_time': endTime,
                'limit': limit,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /markets
     * Returns a list of instruments. If `asset` is not specified, the response will include all listed instruments.
     * @param asset Name of underlying asset.
     * @param instrumentType Type of instrument.
     * @returns any List of instruments.
     * @throws ApiError
     */
    public getMarkets(
        asset?: string,
        instrumentType?: 'OPTION' | 'PERPETUAL' | 'SPOT',
    ): CancelablePromise<Array<{
        instrument_id: instrument_id_response;
        instrument_name: instrument_name_response;
        instrument_type: instrument_type_response;
        underlying_asset: underlying_asset_response;
        quote_asset: quote_asset_response;
        price_step: price_step_response;
        amount_step: amount_step_response;
        min_order_value: min_order_value_response;
        max_order_value: max_order_value_response;
        max_notional_value: max_notional_value_response;
        mark_price: mark_price_response;
        forward_price?: forward_price_response;
        index_price: index_price_response;
        is_active: is_active_response;
        option_type?: option_type_response;
        expiry?: expiry_response;
        strike?: strike_response;
        greeks?: {
            delta: delta_response;
            gamma: gamma_response;
            rho: rho_response;
            theta: theta_response;
            vega: vega_response;
            iv: iv_response;
        };
        max_leverage?: max_leverage_response;
        pre_launch?: pre_launch_response;
    }>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/markets',
            query: {
                'asset': asset,
                'instrument_type': instrumentType,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /statistics
     * Returns the market statistics for the given asset.
     * @param asset Name of underlying asset.
     * @param instrumentType Type of instrument.
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @returns any Instrument trade information.
     * @throws ApiError
     */
    public getStatistics(
        asset?: string,
        instrumentType?: 'OPTION' | 'PERPETUAL' | 'SPOT',
        endTime?: number,
    ): CancelablePromise<{
        asset?: asset_response;
        open_interest?: {
            calls?: calls_response;
            puts?: puts_response;
            total: total_response;
        };
        daily_volume: daily_volume_response;
        daily_buy_volume: daily_buy_volume_response;
        daily_sell_volume: daily_sell_volume_response;
        daily_volume_premium?: daily_volume_premium_response;
        total_volume?: total_volume_response;
        total_volume_premium?: total_volume_premium_response;
        daily_volume_contracts?: daily_volume_contracts_response;
        index_price?: index_price_response;
        index_daily_change?: index_daily_change_response;
        mark_price?: mark_price_response;
        mark_price_24h_ago?: mark_price_24h_ago_response;
        mark_daily_change?: mark_daily_change_response;
        funding_daily_avg?: funding_daily_avg_response;
        put_call_ratio?: put_call_ratio_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/statistics',
            query: {
                'asset': asset,
                'instrument_type': instrumentType,
                'end_time': endTime,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /coingecko-statistics
     * Returns the perpetual statistics of all assets specifically for https://www.coingecko.com/en/exchanges/aevo
     * @returns any Instrument trade information.
     * @throws ApiError
     */
    public getCoingeckoStatistics(): CancelablePromise<Array<{
        ticker_id: ticker_id_response;
        base_currency?: base_currency_response;
        target_currency?: target_currency_response;
        target_volume?: target_volume_response;
        product_volume?: product_volume_response;
        open_interest?: open_interest_response;
        index_price?: index_price_response;
        index_currency?: index_currency_response;
        next_funding_rate_timestamp?: next_funding_rate_timestamp_response;
        funding_rate?: funding_rate_response;
        contract_type?: contract_type_response;
        contract_price_currency?: contract_price_currency_response;
    }>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/coingecko-statistics',
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /orderbook
     * Returns the orderbook for a given symbol.
     * @param instrumentName Instrument name.
     * @returns any Instrument orderbook.
     * @throws ApiError
     */
    public getOrderbook(
        instrumentName: string,
    ): CancelablePromise<{
        type: type_response;
        instrument_id: instrument_id_response;
        instrument_name: instrument_name_response;
        instrument_type: instrument_type_response;
        /**
         * Array of 3 elements, price in USD, contract amount, and IV respectively.
         */
        bids?: Array<bids_response>;
        /**
         * Array of 3 elements, price in USD, contract amount, and IV respectively.
         */
        asks?: Array<asks_response>;
        last_updated: last_updated_response;
        checksum: checksum_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/orderbook',
            query: {
                'instrument_name': instrumentName,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /funding
     * Returns the current funding rate for the instrument.
     * @param instrumentName Instrument name.
     * @returns any Funding rate of the instrument.
     * @throws ApiError
     */
    public getFunding(
        instrumentName: string,
    ): CancelablePromise<{
        funding_rate: funding_rate_response;
        next_epoch: next_epoch_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/funding',
            query: {
                'instrument_name': instrumentName,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /funding-history
     * Returns the funding rate history for the instrument.
     * @param instrumentName Instrument name.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @returns any Funding rate history of the instrument.
     * @throws ApiError
     */
    public getFundingHistory(
        instrumentName?: string,
        startTime?: number,
        endTime?: number,
        limit?: number,
    ): CancelablePromise<{
        /**
         * List of [instrument name, timestamp, funding rate, mark price]. Timestamp is in UNIX nanoseconds. Funding rate is in decimals.
         */
        funding_history?: Array<funding_history_response>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/funding-history',
            query: {
                'instrument_name': instrumentName,
                'start_time': startTime,
                'end_time': endTime,
                'limit': limit,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /instrument/{instrument_name}
     * Returns the instrument information for the given instrument.
     * @param instrumentName Instrument name.
     * @returns any Instrument information.
     * @throws ApiError
     */
    public getInstrumentInstrumentName(
        instrumentName: string,
    ): CancelablePromise<{
        asset: asset_response;
        instrument_id: instrument_id_response;
        instrument_name: instrument_name_response;
        instrument_type: instrument_type_response;
        mark_price: mark_price_response;
        index_price: index_price_response;
        forward_price: forward_price_response;
        best_bid?: {
            price: price_response;
            amount: amount_response;
            iv: iv_response;
        };
        best_ask?: {
            price: price_response;
            amount: amount_response;
            iv: iv_response;
        };
        markets?: {
            daily_volume: daily_volume_response;
            daily_volume_contracts: daily_volume_contracts_response;
            total_volume: total_volume_response;
            total_volume_contracts: total_volume_contracts_response;
            total_oi: total_oi_response;
        };
        greeks?: {
            delta: delta_response;
            gamma: gamma_response;
            rho: rho_response;
            theta: theta_response;
            vega: vega_response;
            iv: iv_response;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/instrument/{instrument_name}',
            path: {
                'instrument_name': instrumentName,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /instrument/{instrument_name}/trade-history
     * Returns the trade history for the given instrument.
     * @param instrumentName Instrument name.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @returns any Instrument trade information.
     * @throws ApiError
     */
    public getInstrumentInstrumentNameTradeHistory(
        instrumentName: string,
        startTime?: number,
        endTime?: number,
    ): CancelablePromise<{
        count: count_response;
        trade_history?: Array<{
            trade_id: trade_id_response;
            instrument_id: instrument_id_response;
            instrument_name: instrument_name_response;
            instrument_type: instrument_type_response;
            side: side_response;
            price: price_response;
            amount: amount_response;
            created_timestamp: created_timestamp_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/instrument/{instrument_name}/trade-history',
            path: {
                'instrument_name': instrumentName,
            },
            query: {
                'start_time': startTime,
                'end_time': endTime,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /check-referral
     * Check if user can be referred.
     * @param account Account's Ethereum address.
     * @param referralCode Referral Code (username of referrer) of the new account registration
     * @returns any Can user be referred
     * @throws ApiError
     */
    public getCheckReferral(
        account: string,
        referralCode: string,
    ): CancelablePromise<{
        is_referrable: is_referrable_response;
        referee_discount: referee_discount_response;
        code?: code_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/check-referral',
            query: {
                'account': account,
                'referral_code': referralCode,
            },
            errors: {
                400: `Bad request.`,
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /account/unsubscribe
     * Unsubscribe from all email preferences
     * @param requestBody
     * @returns any Is account unsubscribed
     * @throws ApiError
     */
    public postAccountUnsubscribe(
        requestBody?: {
            account: account;
            email_auth_token: email_auth_token;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/account/unsubscribe',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request.`,
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /time
     * Returns the server time
     * @returns any Server time.
     * @throws ApiError
     */
    public getTime(): CancelablePromise<{
        name: name_response;
        timestamp: timestamp_response;
        time: time_response;
        sequence: sequence_response;
        block: block_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/time',
            errors: {
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /yield-vault
     * Returns the yield vault information for the given yield vault.
     * @returns any Yield vault information.
     * @throws ApiError
     */
    public getYieldVault(): CancelablePromise<{
        aum: aum_response;
        aum_liquid: aum_liquid_response;
        cap: cap_response;
        pps: pps_response;
        apy: apy_response;
        pending_withdrawals: pending_withdrawals_response;
        is_paused: is_paused_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/yield-vault',
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /swap/preview
     * Previews a collateral swap
     * @param requestBody
     * @returns any Swap details.
     * @throws ApiError
     */
    public postSwapPreview(
        requestBody?: {
            collateral_asset: collateral_asset;
            is_buy?: is_buy;
            base_amount?: base_amount;
            quote_amount?: quote_amount;
        },
    ): CancelablePromise<{
        quote_amount: quote_amount_response;
        fees: fees_response;
        fee_rate: fee_rate_response;
        base_balance: base_balance_response;
        quote_balance: quote_balance_response;
        base_capacity: base_capacity_response;
        quote_capacity: quote_capacity_response;
        amount: amount__swap_preview_response;
        price: price__swap_preview_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/swap/preview',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request.`,
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * INTERNAL GET /status
     * Returns the exchange status.
     * @returns any Exchange status.
     * @throws ApiError
     */
    public getStatus(): CancelablePromise<{
        status: exchange_status_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/status',
            errors: {
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * INTERNAL GET /options-chain
     * Returns the options chain for a given asset and expiry.
     * @param asset Name of underlying asset.
     * @param expiry Option expiry in UNIX timestamp in nanoseconds.
     * @returns any Instrument trade information.
     * @throws ApiError
     */
    public getOptionsChain(
        asset: string,
        expiry: string,
    ): CancelablePromise<{
        asset: asset_response;
        options?: {
            calls?: Array<{
                instrument_name: instrument_name_response;
                instrument_id: instrument_id_response;
                mark_price: mark_price_response;
                iv: iv_response;
                delta: delta_response;
                open_interest: open_interest_response;
                strike: strike_response;
                expiry: expiry_response;
                ticker?: {
                    bid?: {
                        price: price_response;
                        volume: volume_response;
                        iv: iv_response;
                    };
                    ask?: {
                        price: price_response;
                        volume: volume_response;
                        iv: iv_response;
                    };
                };
            }>;
            puts?: Array<{
                instrument_name: instrument_name_response;
                instrument_id: instrument_id_response;
                mark_price: mark_price_response;
                iv: iv_response;
                delta: delta_response;
                open_interest: open_interest_response;
                strike: strike_response;
                expiry: expiry_response;
                ticker?: {
                    bid?: {
                        price: price_response;
                        volume: volume_response;
                        iv: iv_response;
                    };
                    ask?: {
                        price: price_response;
                        volume: volume_response;
                        iv: iv_response;
                    };
                };
            }>;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/options-chain',
            query: {
                'asset': asset,
                'expiry': expiry,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /options-history
     * Returns the trade history for group of instrument.
     * @param asset Name of underlying asset.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param optionType Type of option contract.
     * @param offset Offset.
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @returns any Trades.
     * @throws ApiError
     */
    public getOptionsHistory(
        asset: string,
        startTime?: number,
        endTime?: number,
        optionType?: 'put' | 'call',
        offset?: number,
        limit?: number,
    ): CancelablePromise<Array<{
        instrument_name: instrument_name_response;
        option_type: option_type_response;
        expiry: expiry_response;
        strike: strike_response;
        iv: iv_response;
        order_type: order_type_response;
        side: side_response;
        avg_price: avg_price_response;
        amount: amount_response;
        trade_status: trade_status_response;
        created_timestamp: created_timestamp_response;
    }>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/options-history',
            query: {
                'asset': asset,
                'start_time': startTime,
                'end_time': endTime,
                'option_type': optionType,
                'offset': offset,
                'limit': limit,
            },
            errors: {
                400: `Bad request.`,
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * INTERNAL GET /index-histories
     * Returns the historical index price for an array of assets.
     * @param assets Array of assets
     * @param resolution Interval between entries in seconds. Must be a multiple of 30. Defaults to `30`
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @returns any Array of historical index price of the given assets.
     * @throws ApiError
     */
    public getIndexHistories(
        assets: Array<string>,
        resolution?: number,
        startTime?: number,
        endTime?: number,
    ): CancelablePromise<{
        assets_history?: Array<{
            asset: asset_response;
            /**
             * List of [timestamp, price]. Timestamp is in UNIX nanoseconds.
             */
            history?: Array<history_response>;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/index-histories',
            query: {
                'assets': assets,
                'resolution': resolution,
                'start_time': startTime,
                'end_time': endTime,
            },
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * INTERNAL GET /check-restricted
     * Returns the restriction status of the IP address calling the API.
     * @returns any Response containing the country and restriction status.
     * @throws ApiError
     */
    public getCheckRestricted(): CancelablePromise<{
        restricted: restricted_response;
        country: country_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/check-restricted',
            errors: {
                400: `Bad request.`,
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * INTERNAL GET /leaderboard
     * Returns the leaderboard for a given instrument type.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param instrumentType Type of instrument.
     * @param leaderboardType Is maker.
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param offset Offset.
     * @returns any Leaderboard.
     * @throws ApiError
     */
    public getLeaderboard(
        startTime: number,
        limit: number,
        instrumentType?: 'OPTION' | 'PERPETUAL' | 'SPOT',
        leaderboardType?: 'MAKER' | 'TAKER',
        endTime?: number,
        offset?: number,
    ): CancelablePromise<{
        total_volume: total_volume_response;
        ranking?: Array<{
            username: username_response;
            volume: volume_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/leaderboard',
            query: {
                'instrument_type': instrumentType,
                'start_time': startTime,
                'limit': limit,
                'leaderboard_type': leaderboardType,
                'end_time': endTime,
                'offset': offset,
            },
            errors: {
                400: `Bad request.`,
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * INTERNAL GET /markets-summary
     * Returns the market summary for the given asset. Used to populate the markets dropdown in the app
     * @returns any Markets summary
     * @throws ApiError
     */
    public getMarketsSummary(): CancelablePromise<{
        summaries?: Array<{
            asset: asset_response;
            index_price: index_price_response;
            index_daily_change: index_daily_change_response;
            option_info?: {
                open_interest?: {
                    calls?: calls_response;
                    puts?: puts_response;
                    total: total_response;
                };
                daily_volume?: daily_volume_response;
                mark_price: mark_price_response;
                mark_daily_change: mark_daily_change_response;
                price_step: price_step_response;
                amount_step: amount_step_response;
            };
            perpetual_info?: {
                open_interest?: {
                    total: total_response;
                };
                mark_price: mark_price_response;
                mark_daily_change: mark_daily_change_response;
                pre_launch?: pre_launch_response;
                daily_volume?: daily_volume_response;
                price_step: price_step_response;
                amount_step: amount_step_response;
            };
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/markets-summary',
            errors: {
                400: `Bad request.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /account/email-verified
     * Verify an account's email.
     * @param requestBody
     * @returns any Is the account's email verified
     * @throws ApiError
     */
    public postAccountEmailVerified(
        requestBody?: {
            account: account;
            email_auth_token: email_auth_token;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/account/email-verified',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request.`,
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
}
