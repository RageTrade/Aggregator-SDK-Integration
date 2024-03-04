/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { account } from '../models/account';
import type { account_response } from '../models/account_response';
import type { account_signature } from '../models/account_signature';
import type { account_type_response } from '../models/account_type_response';
import type { accumulated_funding_response } from '../models/accumulated_funding_response';
import type { agg_order_id_response } from '../models/agg_order_id_response';
import type { aggressing_quote_id_response } from '../models/aggressing_quote_id_response';
import type { amount } from '../models/amount';
import type { amount_change_response } from '../models/amount_change_response';
import type { amount_float } from '../models/amount_float';
import type { amount_limit } from '../models/amount_limit';
import type { amount_limit_response } from '../models/amount_limit_response';
import type { amount_precision_response } from '../models/amount_precision_response';
import type { amount_response } from '../models/amount_response';
import type { amount_type_response } from '../models/amount_type_response';
import type { amount_usdc } from '../models/amount_usdc';
import type { api_key } from '../models/api_key';
import type { api_key_response } from '../models/api_key_response';
import type { api_secret_response } from '../models/api_secret_response';
import type { asks_response } from '../models/asks_response';
import type { asset } from '../models/asset';
import type { asset_response } from '../models/asset_response';
import type { available_balance_response } from '../models/available_balance_response';
import type { avg_entry_price_response } from '../models/avg_entry_price_response';
import type { avg_price_response } from '../models/avg_price_response';
import type { balance_response } from '../models/balance_response';
import type { base_amount } from '../models/base_amount';
import type { bids_response } from '../models/bids_response';
import type { block_id } from '../models/block_id';
import type { block_id_response } from '../models/block_id_response';
import type { block_status_response } from '../models/block_status_response';
import type { block_trade_id_response } from '../models/block_trade_id_response';
import type { capacity_response } from '../models/capacity_response';
import type { chain_id_response } from '../models/chain_id_response';
import type { close_position } from '../models/close_position';
import type { close_position_response } from '../models/close_position_response';
import type { collateral } from '../models/collateral';
import type { collateral_asset } from '../models/collateral_asset';
import type { collateral_asset_response } from '../models/collateral_asset_response';
import type { collateral_response } from '../models/collateral_response';
import type { collateral_value_response } from '../models/collateral_value_response';
import type { collateral_yield_bearing_response } from '../models/collateral_yield_bearing_response';
import type { commission_response } from '../models/commission_response';
import type { count_response } from '../models/count_response';
import type { counter_party_response } from '../models/counter_party_response';
import type { counterparties } from '../models/counterparties';
import type { created_timestamp_response } from '../models/created_timestamp_response';
import type { credit_response } from '../models/credit_response';
import type { credited_response } from '../models/credited_response';
import type { deadline_response } from '../models/deadline_response';
import type { delta_change_response } from '../models/delta_change_response';
import type { delta_limit } from '../models/delta_limit';
import type { delta_limit_response } from '../models/delta_limit_response';
import type { delta_response } from '../models/delta_response';
import type { description_response } from '../models/description_response';
import type { duration } from '../models/duration';
import type { duration_response } from '../models/duration_response';
import type { email_address } from '../models/email_address';
import type { email_address_response } from '../models/email_address_response';
import type { email_preferences_response } from '../models/email_preferences_response';
import type { email_type } from '../models/email_type';
import type { email_verified_response } from '../models/email_verified_response';
import type { enabled } from '../models/enabled';
import type { enabled_response } from '../models/enabled_response';
import type { entry_price_response } from '../models/entry_price_response';
import type { equity_response } from '../models/equity_response';
import type { error_response } from '../models/error_response';
import type { expiry } from '../models/expiry';
import type { expiry_response } from '../models/expiry_response';
import type { fee_rate_response } from '../models/fee_rate_response';
import type { fees_response } from '../models/fees_response';
import type { filled_response } from '../models/filled_response';
import type { finalized_timestamp_response } from '../models/finalized_timestamp_response';
import type { frozen } from '../models/frozen';
import type { frozen_end_time_response } from '../models/frozen_end_time_response';
import type { frozen_response } from '../models/frozen_response';
import type { full_size } from '../models/full_size';
import type { full_size_response } from '../models/full_size_response';
import type { gamma_response } from '../models/gamma_response';
import type { has_been_referred_response } from '../models/has_been_referred_response';
import type { history_response } from '../models/history_response';
import type { in_liquidation_response } from '../models/in_liquidation_response';
import type { index_price_response } from '../models/index_price_response';
import type { initial_margin_response } from '../models/initial_margin_response';
import type { initiated_timestamp_response } from '../models/initiated_timestamp_response';
import type { instrument } from '../models/instrument';
import type { instrument_id_response } from '../models/instrument_id_response';
import type { instrument_name_response } from '../models/instrument_name_response';
import type { instrument_type } from '../models/instrument_type';
import type { instrument_type_response } from '../models/instrument_type_response';
import type { intercom_hash_response } from '../models/intercom_hash_response';
import type { interval } from '../models/interval';
import type { interval_response } from '../models/interval_response';
import type { ip_addresses } from '../models/ip_addresses';
import type { ip_addresses_response } from '../models/ip_addresses_response';
import type { is_buy } from '../models/is_buy';
import type { is_buy_response } from '../models/is_buy_response';
import type { is_closing_response } from '../models/is_closing_response';
import type { is_read_response } from '../models/is_read_response';
import type { isolated_margin } from '../models/isolated_margin';
import type { isolated_margin_response } from '../models/isolated_margin_response';
import type { iv_response } from '../models/iv_response';
import type { l1_tx_hash_response } from '../models/l1_tx_hash_response';
import type { l1Token_response } from '../models/l1Token_response';
import type { l2_tx_hash_response } from '../models/l2_tx_hash_response';
import type { l2Token_response } from '../models/l2Token_response';
import type { label } from '../models/label';
import type { label_response } from '../models/label_response';
import type { leverage } from '../models/leverage';
import type { leverage_response } from '../models/leverage_response';
import type { limit_price } from '../models/limit_price';
import type { limit_price_response } from '../models/limit_price_response';
import type { link_response } from '../models/link_response';
import type { liquidation_fee_response } from '../models/liquidation_fee_response';
import type { liquidation_price_response } from '../models/liquidation_price_response';
import type { liquidity_response } from '../models/liquidity_response';
import type { maintenance_margin_response } from '../models/maintenance_margin_response';
import type { maker } from '../models/maker';
import type { maker_fee_response } from '../models/maker_fee_response';
import type { margin_type } from '../models/margin_type';
import type { margin_type_response } from '../models/margin_type_response';
import type { mark_price_response } from '../models/mark_price_response';
import type { mmp } from '../models/mmp';
import type { mmp_enabled_response } from '../models/mmp_enabled_response';
import type { name } from '../models/name';
import type { name_response } from '../models/name_response';
import type { notification_type_response } from '../models/notification_type_response';
import type { option_type_response } from '../models/option_type_response';
import type { order_id_response } from '../models/order_id_response';
import type { order_status_response } from '../models/order_status_response';
import type { order_type_response } from '../models/order_type_response';
import type { payout_response } from '../models/payout_response';
import type { pending_withdrawals_response } from '../models/pending_withdrawals_response';
import type { period_response } from '../models/period_response';
import type { pnl_response } from '../models/pnl_response';
import type { portfolio_response } from '../models/portfolio_response';
import type { position_count_response } from '../models/position_count_response';
import type { post_only } from '../models/post_only';
import type { price } from '../models/price';
import type { price_precision_response } from '../models/price_precision_response';
import type { price_response } from '../models/price_response';
import type { profit_factor_response } from '../models/profit_factor_response';
import type { quote_amount } from '../models/quote_amount';
import type { quote_id_response } from '../models/quote_id_response';
import type { quote_status_response } from '../models/quote_status_response';
import type { ratio } from '../models/ratio';
import type { ratio_response } from '../models/ratio_response';
import type { read_only } from '../models/read_only';
import type { read_only_response } from '../models/read_only_response';
import type { realized_pnl_response } from '../models/realized_pnl_response';
import type { recipient } from '../models/recipient';
import type { reduce_only } from '../models/reduce_only';
import type { reduce_only_response } from '../models/reduce_only_response';
import type { referee_response } from '../models/referee_response';
import type { referee_username_response } from '../models/referee_username_response';
import type { referral_code } from '../models/referral_code';
import type { referred_response } from '../models/referred_response';
import type { referrer_response } from '../models/referrer_response';
import type { reward_type_response } from '../models/reward_type_response';
import type { rewards_response } from '../models/rewards_response';
import type { rho_response } from '../models/rho_response';
import type { role_response } from '../models/role_response';
import type { salt } from '../models/salt';
import type { send_email_verification_response } from '../models/send_email_verification_response';
import type { settlement_price_response } from '../models/settlement_price_response';
import type { sharpe_ratio_response } from '../models/sharpe_ratio_response';
import type { side_response } from '../models/side_response';
import type { signature } from '../models/signature';
import type { signing_key } from '../models/signing_key';
import type { signing_key_response } from '../models/signing_key_response';
import type { signing_key_signature } from '../models/signing_key_signature';
import type { socket_connector } from '../models/socket_connector';
import type { socket_connector_response } from '../models/socket_connector_response';
import type { socket_fees } from '../models/socket_fees';
import type { socket_msg_gas_limit } from '../models/socket_msg_gas_limit';
import type { spot_price_response } from '../models/spot_price_response';
import type { stop } from '../models/stop';
import type { stop_response } from '../models/stop_response';
import type { stop_type_response } from '../models/stop_type_response';
import type { strategy_address } from '../models/strategy_address';
import type { strategy_transaction_type } from '../models/strategy_transaction_type';
import type { strike_response } from '../models/strike_response';
import type { success_response } from '../models/success_response';
import type { swap_asset_response } from '../models/swap_asset_response';
import type { system_type } from '../models/system_type';
import type { system_type_response } from '../models/system_type_response';
import type { taker_fee_response } from '../models/taker_fee_response';
import type { theta_response } from '../models/theta_response';
import type { time_in_force } from '../models/time_in_force';
import type { timestamp } from '../models/timestamp';
import type { timestamp_response } from '../models/timestamp_response';
import type { to } from '../models/to';
import type { to_response } from '../models/to_response';
import type { total_matched_amount_response } from '../models/total_matched_amount_response';
import type { total_referee_discount_response } from '../models/total_referee_discount_response';
import type { total_referee_discount_unclaimed_response } from '../models/total_referee_discount_unclaimed_response';
import type { total_referral_bonus_response } from '../models/total_referral_bonus_response';
import type { total_referral_bonus_unclaimed_response } from '../models/total_referral_bonus_unclaimed_response';
import type { total_rewards_response } from '../models/total_rewards_response';
import type { total_rewards_unclaimed_response } from '../models/total_rewards_unclaimed_response';
import type { total_volume_response } from '../models/total_volume_response';
import type { trade_id_response } from '../models/trade_id_response';
import type { trade_status_response } from '../models/trade_status_response';
import type { trade_type_response } from '../models/trade_type_response';
import type { trigger } from '../models/trigger';
import type { trigger_response } from '../models/trigger_response';
import type { triggered_response } from '../models/triggered_response';
import type { tx_hash_response } from '../models/tx_hash_response';
import type { tx_status_response } from '../models/tx_status_response';
import type { tx_type_response } from '../models/tx_type_response';
import type { unrealized_pnl_response } from '../models/unrealized_pnl_response';
import type { updated_timestamp_response } from '../models/updated_timestamp_response';
import type { used_response } from '../models/used_response';
import type { username_response } from '../models/username_response';
import type { vega_response } from '../models/vega_response';
import type { volume_response } from '../models/volume_response';
import type { win_rate_response } from '../models/win_rate_response';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class PrivateApiService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * INTERNAL GET /socket/capacity
     * Returns all account's orders.
     * @returns any The socket withdrawal capacity for each destination chain.
     * @throws ApiError
     */
    public getSocketCapacity(): CancelablePromise<Array<{
        socket_connector: socket_connector_response;
        chain_id: chain_id_response;
        capacity: capacity_response;
    }>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/socket/capacity',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /register
     * Registers a new account.
     * @param requestBody
     * @returns any Account keys and credentials.
     * @throws ApiError
     */
    public postRegister(
        requestBody?: {
            account: account;
            signing_key: signing_key;
            expiry: expiry;
            account_signature: account_signature;
            signing_key_signature: signing_key_signature;
            referral_code?: referral_code;
        },
    ): CancelablePromise<{
        success: success_response;
        signing_keys?: Array<{
            signing_key: signing_key_response;
            expiry: expiry_response;
            created_timestamp: created_timestamp_response;
        }>;
        api_key: api_key_response;
        api_secret: api_secret_response;
        read_only: read_only_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/register',
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
     * DELETE /api-key
     * Removes the account's API key. This logs out the account.
     * @param requestBody
     * @returns any Removal Status.
     * @throws ApiError
     */
    public deleteApiKey(
        requestBody?: {
            api_key: api_key;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api-key',
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
     * GET /api-key
     * Returns the API key information.
     * @param apiKey Account's API Key.
     * @param timestamp Timestamp in UNIX in nanoseconds.
     * @param signature Hash of order payload signature signed by the account.
     * @returns any API key information.
     * @throws ApiError
     */
    public getApiKey(
        apiKey: string,
        timestamp: string,
        signature: string,
    ): CancelablePromise<{
        name?: name_response;
        api_key: api_key_response;
        api_secret: api_secret_response;
        ip_addresses?: ip_addresses_response;
        read_only: read_only_response;
        created_timestamp: created_timestamp_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api-key',
            query: {
                'api_key': apiKey,
                'timestamp': timestamp,
                'signature': signature,
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
     * POST /api-key
     * Creates a new API key.
     * @param requestBody
     * @returns any API key details.
     * @throws ApiError
     */
    public postApiKey(
        requestBody?: {
            name: name;
            ip_addresses?: ip_addresses;
            read_only?: read_only;
        },
    ): CancelablePromise<{
        name: name_response;
        api_key: api_key_response;
        api_secret: api_secret_response;
        ip_addresses?: ip_addresses_response;
        read_only: read_only_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api-key',
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
     * DELETE /signing-key
     * Removes the account's signing key. This logs out the account.
     * @param requestBody
     * @returns any Removal Status.
     * @throws ApiError
     */
    public deleteSigningKey(
        requestBody?: {
            signing_key: signing_key;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/signing-key',
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
     * GET /auth
     * Returns true if the given headers has valid authentication
     * @returns any Authentication status.
     * @throws ApiError
     */
    public getAuth(): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /account
     * Returns the account's information including API keys, signing keys and positions.
     * @returns any Account information.
     * @throws ApiError
     */
    public getAccount(): CancelablePromise<{
        account: account_response;
        username: username_response;
        equity: equity_response;
        available_balance: available_balance_response;
        balance: balance_response;
        signing_keys?: Array<{
            signing_key: signing_key_response;
            expiry: expiry_response;
            created_timestamp: created_timestamp_response;
        }>;
        collaterals?: Array<{
            collateral_asset: collateral_asset_response;
            collateral_value: collateral_value_response;
            balance: balance_response;
            available_balance: available_balance_response;
            collateral_yield_bearing: collateral_yield_bearing_response;
            pending_withdrawals: pending_withdrawals_response;
            unrealized_pnl: unrealized_pnl_response;
            margin_value: string;
            withdrawable_balance: string;
        }>;
        api_keys?: Array<{
            name?: name_response;
            api_key: api_key_response;
            ip_addresses?: ip_addresses_response;
            read_only: read_only_response;
            created_timestamp: created_timestamp_response;
        }>;
        positions?: Array<{
            instrument_id: instrument_id_response;
            instrument_name: instrument_name_response;
            instrument_type: instrument_type_response;
            option?: {
                strike: strike_response;
                option_type: option_type_response;
                expiry: expiry_response;
                iv: iv_response;
                delta: delta_response;
                theta: theta_response;
                vega: vega_response;
                rho: rho_response;
                gamma: gamma_response;
            };
            iv?: iv_response;
            asset: asset_response;
            amount: amount_response;
            side: side_response;
            mark_price: mark_price_response;
            avg_entry_price: avg_entry_price_response;
            unrealized_pnl: unrealized_pnl_response;
            maintenance_margin: maintenance_margin_response;
            margin_type?: margin_type_response;
            liquidation_price?: liquidation_price_response;
            isolated_margin?: isolated_margin_response;
            leverage?: leverage_response;
            triggers?: {
                take_profit?: {
                    order_id: order_id_response;
                    trigger: trigger_response;
                };
                stop_loss?: {
                    order_id: order_id_response;
                    trigger: trigger_response;
                };
            };
        }>;
        account_type: account_type_response;
        fee_structures?: Array<{
            asset: asset_response;
            instrument_type: instrument_type_response;
            taker_fee: taker_fee_response;
            maker_fee: maker_fee_response;
        }>;
        portfolio: portfolio_response;
        in_liquidation: in_liquidation_response;
        initial_margin: initial_margin_response;
        maintenance_margin: maintenance_margin_response;
        email_address: email_address_response;
        intercom_hash: intercom_hash_response;
        credit: credit_response;
        credited: credited_response;
        has_been_referred: has_been_referred_response;
        leverages?: Array<{
            instrument_id: instrument_id_response;
            leverage: leverage_response;
            margin_type: margin_type_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/account',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /positions
     * Returns the account's positions
     * @returns any Account position information.
     * @throws ApiError
     */
    public getPositions(): CancelablePromise<{
        account: account_response;
        positions?: Array<{
            instrument_id: instrument_id_response;
            instrument_name: instrument_name_response;
            instrument_type: instrument_type_response;
            option?: {
                strike: strike_response;
                option_type: option_type_response;
                expiry: expiry_response;
                iv: iv_response;
                delta: delta_response;
                theta: theta_response;
                vega: vega_response;
                rho: rho_response;
                gamma: gamma_response;
            };
            iv?: iv_response;
            asset: asset_response;
            amount: amount_response;
            side: side_response;
            mark_price: mark_price_response;
            avg_entry_price: avg_entry_price_response;
            unrealized_pnl: unrealized_pnl_response;
            maintenance_margin: maintenance_margin_response;
            margin_type?: margin_type_response;
            liquidation_price?: liquidation_price_response;
            isolated_margin?: isolated_margin_response;
            leverage?: leverage_response;
            triggers?: {
                take_profit?: {
                    order_id: order_id_response;
                    trigger: trigger_response;
                };
                stop_loss?: {
                    order_id: order_id_response;
                    trigger: trigger_response;
                };
            };
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/positions',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /account/cancel-on-disconnect
     * Check the Cancel on Disconnect (CoD) setting for your account.
     * @returns any Whether the Cancel on Disconnect (CoD) setting is enabled or disabled.
     * @throws ApiError
     */
    public getAccountCancelOnDisconnect(): CancelablePromise<{
        enabled: enabled_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/account/cancel-on-disconnect',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /account/cancel-on-disconnect
     * Enables or disables the Cancel on Disconnect (CoD) setting for your account. When CoD is enabled, when a websocket connection is closed, all orders placed via that connection will be cancelled.
     * @param requestBody
     * @returns any Whether or not the setting was successfully updated.
     * @throws ApiError
     */
    public postAccountCancelOnDisconnect(
        requestBody?: {
            enabled: enabled;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/account/cancel-on-disconnect',
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
     * POST /account/portfolio-margin
     * Enables or disables the portfolio margin on your acccount.
     * @param requestBody
     * @returns any Whether or not the setting was successfully updated.
     * @throws ApiError
     */
    public postAccountPortfolioMargin(
        requestBody?: {
            enabled: enabled;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/account/portfolio-margin',
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
     * GET /account/email-address
     * Check the Email Address for your account.
     * @returns any The Email Address for your account.
     * @throws ApiError
     */
    public getAccountEmailAddress(): CancelablePromise<{
        email_address: email_address_response;
        send_email_verification?: send_email_verification_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/account/email-address',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /account/email-address
     * Sets up an email address for a user.
     * @param requestBody
     * @returns any Whether or not the setting was successfully updated.
     * @throws ApiError
     */
    public postAccountEmailAddress(
        requestBody?: {
            email_address: email_address;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/account/email-address',
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
     * POST /account/email-preference
     * Sets up email preference for a user.
     * @param requestBody
     * @returns any Whether or not the setting was successfully updated.
     * @throws ApiError
     */
    public postAccountEmailPreference(
        requestBody?: {
            email_type: email_type;
            enabled: enabled;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/account/email-preference',
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
     * GET /account/email-preferences
     * Check the email preferences for your account.
     * @returns any The email preferences for your account.
     * @throws ApiError
     */
    public getAccountEmailPreferences(): CancelablePromise<{
        email_preferences: email_preferences_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/account/email-preferences',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /account/email-verified
     * Check if an account's email is verified.
     * @returns any Whether account email is verified
     * @throws ApiError
     */
    public getAccountEmailVerified(): CancelablePromise<{
        email_verified: email_verified_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/account/email-verified',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /account/accumulated-fundings
     * Get the accumulated funding for your account's positions.
     * @returns any The accumulated funding for an account's positions.
     * @throws ApiError
     */
    public getAccountAccumulatedFundings(): CancelablePromise<{
        accumulated_fundings?: Array<{
            instrument_id: instrument_id_response;
            accumulated_funding?: accumulated_funding_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/account/accumulated-fundings',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /account/update-margin
     * Update margin for your account's positions.
     * @param requestBody
     * @returns any Update margin for an account's positions.
     * @throws ApiError
     */
    public postAccountUpdateMargin(
        requestBody?: {
            instrument: instrument;
            isolated_margin: isolated_margin;
        },
    ): CancelablePromise<{
        success?: {
            instrument_id?: instrument_id_response;
            instrument_name?: instrument_name_response;
            instrument_type?: instrument_type_response;
            option?: {
                strike: strike_response;
                option_type: option_type_response;
                expiry: expiry_response;
                iv: iv_response;
                delta: delta_response;
                theta: theta_response;
                vega: vega_response;
                rho: rho_response;
                gamma: gamma_response;
            };
            iv?: iv_response;
            asset?: asset_response;
            amount?: amount_response;
            side?: side_response;
            mark_price?: mark_price_response;
            avg_entry_price?: avg_entry_price_response;
            unrealized_pnl?: unrealized_pnl_response;
            maintenance_margin?: maintenance_margin_response;
            margin_type?: margin_type_response;
            liquidation_price?: liquidation_price_response;
            isolated_margin?: isolated_margin_response;
            leverage?: leverage_response;
            triggers?: {
                take_profit?: {
                    order_id: order_id_response;
                    trigger: trigger_response;
                };
                stop_loss?: {
                    order_id: order_id_response;
                    trigger: trigger_response;
                };
            };
        };
        position?: {
            instrument_id: instrument_id_response;
            instrument_name: instrument_name_response;
            instrument_type: instrument_type_response;
            option?: {
                strike: strike_response;
                option_type: option_type_response;
                expiry: expiry_response;
                iv: iv_response;
                delta: delta_response;
                theta: theta_response;
                vega: vega_response;
                rho: rho_response;
                gamma: gamma_response;
            };
            iv?: iv_response;
            asset: asset_response;
            amount: amount_response;
            side: side_response;
            mark_price: mark_price_response;
            avg_entry_price: avg_entry_price_response;
            unrealized_pnl: unrealized_pnl_response;
            maintenance_margin: maintenance_margin_response;
            margin_type?: margin_type_response;
            liquidation_price?: liquidation_price_response;
            isolated_margin?: isolated_margin_response;
            leverage?: leverage_response;
            triggers?: {
                take_profit?: {
                    order_id: order_id_response;
                    trigger: trigger_response;
                };
                stop_loss?: {
                    order_id: order_id_response;
                    trigger: trigger_response;
                };
            };
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/account/update-margin',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /account/margin-type
     * Update margin for your account's positions.
     * @param requestBody
     * @returns any Update margin for an account's positions.
     * @throws ApiError
     */
    public postAccountMarginType(
        requestBody?: {
            instrument: instrument;
            margin_type: margin_type;
        },
    ): CancelablePromise<{
        success?: {
            success: success_response;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/account/margin-type',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /account/leverage
     * Set the leverage of an instrument for your account.
     * @param requestBody
     * @returns any Leverage of the instrument has been set.
     * @throws ApiError
     */
    public postAccountLeverage(
        requestBody?: {
            instrument: instrument;
            leverage: leverage;
        },
    ): CancelablePromise<{
        success?: {
            success: success_response;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/account/leverage',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /portfolio
     * Returns the overall portfolio details of the account.
     * @returns any Portfolio details.
     * @throws ApiError
     */
    public getPortfolio(): CancelablePromise<{
        balance: balance_response;
        pnl: pnl_response;
        realized_pnl: realized_pnl_response;
        profit_factor: profit_factor_response;
        win_rate: win_rate_response;
        sharpe_ratio: sharpe_ratio_response;
        greeks?: Array<{
            asset?: asset_response;
            delta: delta_response;
            gamma: gamma_response;
            rho: rho_response;
            theta: theta_response;
            vega: vega_response;
        }>;
        user_margin?: {
            used: used_response;
            balance: balance_response;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/portfolio',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /withdraw
     * Withdraws USDC from the exchange to L1 Ethereum.
     * @param requestBody
     * @returns any Withdraw status.
     * @throws ApiError
     */
    public postWithdraw(
        requestBody?: {
            account: account;
            collateral: collateral;
            to: to;
            amount: amount_usdc;
            salt: salt;
            signature: signature;
            recipient?: recipient;
            socket_fees?: socket_fees;
            socket_msg_gas_limit?: socket_msg_gas_limit;
            socket_connector?: socket_connector;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/withdraw',
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
     * POST /strategy/initiate-withdraw
     * Initiate a USDC withdraw from strategy.
     * @param requestBody
     * @returns any Initiate withdraw status.
     * @throws ApiError
     */
    public postStrategyInitiateWithdraw(
        requestBody?: {
            strategy_address: strategy_address;
            collateral: collateral;
            amount_float: amount_float;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/strategy/initiate-withdraw',
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
     * POST /strategy/pending-transactions
     * Get a type of pending transactions of a strategy
     * @param requestBody
     * @returns any List of pending transactions.
     * @throws ApiError
     */
    public postStrategyPendingTransactions(
        requestBody?: {
            strategy_transaction_type: strategy_transaction_type;
        },
    ): CancelablePromise<{
        amount_type?: {
            amount_type: amount_type_response;
        };
        pending_transactions?: Array<{
            account: account_response;
            amount: amount_response;
        }>;
        pps?: {
            amount_type?: amount_type_response;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/strategy/pending-transactions',
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
     * POST /transfer
     * Transfer USDC between accounts.
     * @param requestBody
     * @returns any Transfer status.
     * @throws ApiError
     */
    public postTransfer(
        requestBody?: {
            account: account;
            collateral: collateral;
            to: to;
            amount: amount_usdc;
            salt: salt;
            signature: signature;
            label?: label;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/transfer',
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
     * GET /orders
     * Returns all account's orders.
     * @returns any Orders.
     * @throws ApiError
     */
    public getOrders(): CancelablePromise<Array<{
        order_id: order_id_response;
        account: account_response;
        instrument_id: instrument_id_response;
        instrument_name: instrument_name_response;
        instrument_type: instrument_type_response;
        order_type: order_type_response;
        side: side_response;
        amount: amount_response;
        price: price_response;
        avg_price: avg_price_response;
        filled: filled_response;
        order_status: order_status_response;
        reduce_only?: reduce_only_response;
        initial_margin?: initial_margin_response;
        option_type?: option_type_response;
        iv?: iv_response;
        expiry?: expiry_response;
        strike?: strike_response;
        created_timestamp?: created_timestamp_response;
        timestamp: timestamp_response;
        system_type: system_type_response;
        stop?: stop_response;
        trigger?: trigger_response;
        close_position?: close_position_response;
        isolated_margin?: isolated_margin_response;
    }>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/orders',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /orders
     * Creates a new order.
     * @param requestBody
     * @returns any Order created.
     * @throws ApiError
     */
    public postOrders(
        requestBody?: {
            instrument: instrument;
            maker: maker;
            is_buy: is_buy;
            amount: amount;
            limit_price: limit_price;
            salt: salt;
            signature: signature;
            timestamp: timestamp;
            post_only?: post_only;
            reduce_only?: reduce_only;
            time_in_force?: time_in_force;
            mmp?: mmp;
            stop?: stop;
            trigger?: trigger;
            close_position?: close_position;
            system_type?: system_type;
        },
    ): CancelablePromise<{
        order_id: order_id_response;
        account: account_response;
        instrument_id: instrument_id_response;
        instrument_name: instrument_name_response;
        instrument_type: instrument_type_response;
        order_type: order_type_response;
        side: side_response;
        amount: amount_response;
        price: price_response;
        avg_price: avg_price_response;
        filled: filled_response;
        order_status: order_status_response;
        reduce_only?: reduce_only_response;
        initial_margin?: initial_margin_response;
        option_type?: option_type_response;
        iv?: iv_response;
        expiry?: expiry_response;
        strike?: strike_response;
        created_timestamp?: created_timestamp_response;
        timestamp: timestamp_response;
        system_type: system_type_response;
        stop?: stop_response;
        trigger?: trigger_response;
        close_position?: close_position_response;
        isolated_margin?: isolated_margin_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/orders',
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
     * DELETE /orders/{order_id}
     * Cancels an order.
     * @param orderId Order ID is the hash of the order payload
     * @returns any Order cancellation.
     * @throws ApiError
     */
    public deleteOrdersOrderId(
        orderId: string,
    ): CancelablePromise<{
        order_id: order_id_response;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/orders/{order_id}',
            path: {
                'order_id': orderId,
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
     * GET /orders/{order_id}
     * Returns the order details.
     * @param orderId Order ID is the hash of the order payload
     * @returns any Order details.
     * @throws ApiError
     */
    public getOrdersOrderId(
        orderId: string,
    ): CancelablePromise<{
        order_id: order_id_response;
        account: account_response;
        instrument_id: instrument_id_response;
        instrument_name: instrument_name_response;
        instrument_type: instrument_type_response;
        order_type: order_type_response;
        side: side_response;
        amount: amount_response;
        price: price_response;
        avg_price: avg_price_response;
        filled: filled_response;
        order_status: order_status_response;
        reduce_only?: reduce_only_response;
        initial_margin?: initial_margin_response;
        option_type?: option_type_response;
        iv?: iv_response;
        expiry?: expiry_response;
        strike?: strike_response;
        created_timestamp?: created_timestamp_response;
        timestamp: timestamp_response;
        system_type: system_type_response;
        stop?: stop_response;
        trigger?: trigger_response;
        close_position?: close_position_response;
        isolated_margin?: isolated_margin_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/orders/{order_id}',
            path: {
                'order_id': orderId,
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
     * POST /orders/{order_id}
     * Edits an existing order.
     * @param orderId Order ID is the hash of the order payload
     * @param requestBody
     * @returns any New order created.
     * @throws ApiError
     */
    public postOrdersOrderId(
        orderId: string,
        requestBody?: {
            instrument: instrument;
            maker: maker;
            is_buy: is_buy;
            amount: amount;
            limit_price: limit_price;
            salt: salt;
            signature: signature;
            timestamp: timestamp;
            post_only?: post_only;
            reduce_only?: reduce_only;
            time_in_force?: time_in_force;
            mmp?: mmp;
            stop?: stop;
            trigger?: trigger;
            close_position?: close_position;
            system_type?: system_type;
        },
    ): CancelablePromise<{
        order_id: order_id_response;
        account: account_response;
        instrument_id: instrument_id_response;
        instrument_name: instrument_name_response;
        instrument_type: instrument_type_response;
        order_type: order_type_response;
        side: side_response;
        amount: amount_response;
        price: price_response;
        avg_price: avg_price_response;
        filled: filled_response;
        order_status: order_status_response;
        reduce_only?: reduce_only_response;
        initial_margin?: initial_margin_response;
        option_type?: option_type_response;
        iv?: iv_response;
        expiry?: expiry_response;
        strike?: strike_response;
        created_timestamp?: created_timestamp_response;
        timestamp: timestamp_response;
        system_type: system_type_response;
        stop?: stop_response;
        trigger?: trigger_response;
        close_position?: close_position_response;
        isolated_margin?: isolated_margin_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/orders/{order_id}',
            path: {
                'order_id': orderId,
            },
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
     * DELETE /orders-all
     * Cancel all orders. Optionally, you can specify an asset and instrument type to cancel only orders for that asset/instrument type.
     * @param requestBody
     * @returns any Order cancellation status. If any orders were successfully cancelled, they will be found in the `order_ids` field.
     * @throws ApiError
     */
    public deleteOrdersAll(
        requestBody?: {
            asset?: asset;
            instrument_type?: instrument_type;
        },
    ): CancelablePromise<{
        success: success_response;
        /**
         * Order ID is the hash of the order payload
         */
        order_ids?: Array<order_id_response>;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/orders-all',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /order-history
     * Returns order history for the account.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param offset Offset.
     * @param sort Sort field
     * @param sortOrder Either ASC or DESC. Default is DESC
     * @returns any Order history.
     * @throws ApiError
     */
    public getOrderHistory(
        startTime: number,
        endTime?: number,
        limit?: number,
        offset?: number,
        sort?: string,
        sortOrder?: 'ASC' | 'DESC',
    ): CancelablePromise<{
        count: count_response;
        order_history?: Array<{
            order_id: order_id_response;
            account: account_response;
            instrument_id: instrument_id_response;
            instrument_name: instrument_name_response;
            instrument_type: instrument_type_response;
            order_type: order_type_response;
            side: side_response;
            amount: amount_response;
            price: price_response;
            filled: filled_response;
            error?: error_response;
            option_type?: option_type_response;
            expiry?: expiry_response;
            strike?: strike_response;
            stop?: stop_response;
            stop_type?: stop_type_response;
            trigger?: trigger_response;
            order_status: order_status_response;
            created_timestamp: created_timestamp_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/order-history',
            query: {
                'start_time': startTime,
                'end_time': endTime,
                'limit': limit,
                'offset': offset,
                'sort': sort,
                'sort_order': sortOrder,
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
     * GET /order-history/stops
     * Returns stop order history for the account.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param offset Offset.
     * @param sort Sort field
     * @param sortOrder Either ASC or DESC. Default is DESC
     * @returns any Stop order history.
     * @throws ApiError
     */
    public getOrderHistoryStops(
        startTime: number,
        endTime?: number,
        limit?: number,
        offset?: number,
        sort?: string,
        sortOrder?: 'ASC' | 'DESC',
    ): CancelablePromise<{
        count: count_response;
        order_history?: Array<{
            order_id: order_id_response;
            account: account_response;
            instrument_id: instrument_id_response;
            instrument_name: instrument_name_response;
            instrument_type: instrument_type_response;
            order_type: order_type_response;
            side: side_response;
            amount: amount_response;
            price: price_response;
            filled: filled_response;
            error?: error_response;
            option_type?: option_type_response;
            expiry?: expiry_response;
            strike?: strike_response;
            stop?: stop_response;
            stop_type?: stop_type_response;
            trigger?: trigger_response;
            order_status: order_status_response;
            created_timestamp: created_timestamp_response;
            total_matched_amount?: total_matched_amount_response;
            trade_id?: trade_id_response;
            avg_price?: avg_price_response;
            entry_price?: entry_price_response;
            spot_price?: spot_price_response;
            fees?: fees_response;
            is_closing?: is_closing_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/order-history/stops',
            query: {
                'start_time': startTime,
                'end_time': endTime,
                'limit': limit,
                'offset': offset,
                'sort': sort,
                'sort_order': sortOrder,
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
     * GET /trade-history
     * Return the account's trade history.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param asset Name of underlying asset.
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param tradeTypes Type of user trade.
     * @param instrumentType Type of instrument.
     * @param optionType Type of option contract.
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param agg Aggregates trades if set to true.
     * @param offset Offset.
     * @param sort Sort field
     * @param sortOrder Either ASC or DESC. Default is DESC
     * @returns any Trade history.
     * @throws ApiError
     */
    public getTradeHistory(
        startTime: number,
        asset?: string,
        endTime?: number,
        tradeTypes?: Array<'trade' | 'liquidation' | 'settlement' | 'funding'>,
        instrumentType?: 'OPTION' | 'PERPETUAL' | 'SPOT',
        optionType?: 'put' | 'call',
        limit?: number,
        agg?: boolean,
        offset?: number,
        sort?: string,
        sortOrder?: 'ASC' | 'DESC',
    ): CancelablePromise<{
        count: count_response;
        trade_history?: Array<{
            trade_id: trade_id_response;
            order_id?: order_id_response;
            trade_type: trade_type_response;
            account: account_response;
            instrument_id: instrument_id_response;
            instrument_name: instrument_name_response;
            instrument_type: instrument_type_response;
            asset: asset_response;
            spot_price?: spot_price_response;
            amount: amount_response;
            price?: price_response;
            avg_price?: avg_price_response;
            mark_price?: mark_price_response;
            side: side_response;
            fees: fees_response;
            liquidity?: liquidity_response;
            iv?: iv_response;
            fee_rate?: fee_rate_response;
            pnl?: pnl_response;
            payout?: payout_response;
            strike?: strike_response;
            option_type?: option_type_response;
            expiry?: expiry_response;
            order_type?: order_type_response;
            agg_order_id?: agg_order_id_response;
            trade_status?: trade_status_response;
            settlement_price?: settlement_price_response;
            liquidation_fee?: liquidation_fee_response;
            created_timestamp: created_timestamp_response;
            avg_entry_price?: avg_entry_price_response;
            is_closing?: is_closing_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/trade-history',
            query: {
                'start_time': startTime,
                'asset': asset,
                'end_time': endTime,
                'trade_types': tradeTypes,
                'instrument_type': instrumentType,
                'option_type': optionType,
                'limit': limit,
                'agg': agg,
                'offset': offset,
                'sort': sort,
                'sort_order': sortOrder,
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
     * GET /transaction-history
     * Return the account's deposit and withdraw history.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param txType Type of user transaction.
     * @param txStatus Transaction status.
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param offset Offset.
     * @param sort Sort field
     * @param sortOrder Either ASC or DESC. Default is DESC
     * @returns any Transaction history
     * @throws ApiError
     */
    public getTransactionHistory(
        startTime?: number,
        endTime?: number,
        txType?: 'deposit' | 'withdraw' | 'send' | 'receive' | 'swap' | 'yv_deposit' | 'yv_withdraw',
        txStatus?: 'initiated' | 'finalized',
        limit?: number,
        offset?: number,
        sort?: string,
        sortOrder?: 'ASC' | 'DESC',
    ): CancelablePromise<{
        count: count_response;
        transaction_history?: Array<{
            account: account_response;
            amount: amount_response;
            collateral: collateral_response;
            counter_party?: counter_party_response;
            transfer_details?: {
                description: description_response;
                link: link_response;
            };
            finalized_timestamp: finalized_timestamp_response;
            initiated_timestamp: initiated_timestamp_response;
            l1_tx_hash: l1_tx_hash_response;
            l2_tx_hash: l2_tx_hash_response;
            chain_id: chain_id_response;
            tx_status: tx_status_response;
            tx_type: tx_type_response;
            label?: label_response;
            swap_asset?: swap_asset_response;
            side?: side_response;
            fees?: fees_response;
            price?: price_response;
            collateral_name?: string,
            decimals?: number,
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/transaction-history',
            query: {
                'start_time': startTime,
                'end_time': endTime,
                'tx_type': txType,
                'tx_status': txStatus,
                'limit': limit,
                'offset': offset,
                'sort': sort,
                'sort_order': sortOrder,
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
     * GET /referral-rewards-history
     * Return the account's referral rewards history.
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param offset Offset.
     * @returns any Referral rewards history.
     * @throws ApiError
     */
    public getReferralRewardsHistory(
        limit?: number,
        offset?: number,
    ): CancelablePromise<{
        count: count_response;
        referral_rewards_history?: Array<{
            reward_type: reward_type_response;
            rewards: rewards_response;
            created_timestamp: created_timestamp_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/referral-rewards-history',
            query: {
                'limit': limit,
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
     * GET /referral-history
     * Return the account's referral history.
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param offset Offset.
     * @returns any Referral history.
     * @throws ApiError
     */
    public getReferralHistory(
        limit?: number,
        offset?: number,
    ): CancelablePromise<{
        count: count_response;
        referral_history?: Array<{
            referee: referee_response;
            referee_username: referee_username_response;
            total_volume: total_volume_response;
            created_timestamp: created_timestamp_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/referral-history',
            query: {
                'limit': limit,
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
     * GET /referral-statistics
     * Return the account's referral statistics.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @returns any Referral statistics.
     * @throws ApiError
     */
    public getReferralStatistics(
        startTime?: number,
    ): CancelablePromise<{
        referred: referred_response;
        volume: volume_response;
        total_rewards: total_rewards_response;
        total_referral_bonus: total_referral_bonus_response;
        total_referee_discount: total_referee_discount_response;
        total_rewards_unclaimed: total_rewards_unclaimed_response;
        total_referral_bonus_unclaimed: total_referral_bonus_unclaimed_response;
        total_referee_discount_unclaimed: total_referee_discount_unclaimed_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/referral-statistics',
            query: {
                'start_time': startTime,
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
     * POST /claim-referral-rewards
     * User claims referral rewards
     * @returns any Claim Successful
     * @throws ApiError
     */
    public postClaimReferralRewards(): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/claim-referral-rewards',
            errors: {
                400: `Bad request.`,
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /mmp
     * Get market maker protection (MMP) setting.
     * @param asset Name of underlying asset.
     * @returns any Market maker protection (MMP) setting.
     * @throws ApiError
     */
    public getMmp(
        asset: string,
    ): CancelablePromise<{
        enabled: enabled_response;
        triggered: triggered_response;
        interval?: interval_response;
        frozen?: frozen_response;
        frozen_end_time?: frozen_end_time_response;
        amount_limit?: amount_limit_response;
        delta_limit?: delta_limit_response;
        amount_change?: amount_change_response;
        delta_change?: delta_change_response;
        asset: asset_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/mmp',
            query: {
                'asset': asset,
            },
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /mmp
     * Sets market maker protection (MMP) settings.
     * @param requestBody
     * @returns any Setting successful.
     * @throws ApiError
     */
    public postMmp(
        requestBody?: {
            interval: interval;
            frozen: frozen;
            amount_limit: amount_limit;
            delta_limit?: delta_limit;
            asset: asset;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/mmp',
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
     * POST /reset-mmp
     * Reset market maker protection (MMP).
     * @param requestBody
     * @returns any Reset successful.
     * @throws ApiError
     */
    public postResetMmp(
        requestBody?: {
            asset: asset;
        },
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/reset-mmp',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * DELETE /rfqs
     * Cancel all blocks.
     * @returns any Block cancellation status. If any blocks were successfully cancelled, they will be found in the `cancelled` field.
     * @throws ApiError
     */
    public deleteRfqs(): CancelablePromise<{
        /**
         * Block ID is the unique identifier of the block
         */
        cancelled?: Array<block_id_response>;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/rfqs',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /rfqs
     * Get RFQ blocks open for trading.
     * @param role Role of the account
     * @returns any List of RFQ blocks.
     * @throws ApiError
     */
    public getRfqs(
        role?: 'taker' | 'maker',
    ): CancelablePromise<{
        blocks?: Array<{
            block_id: block_id_response;
            legs?: Array<{
                instrument_id: instrument_id_response;
                instrument_name: instrument_name_response;
                instrument_type: instrument_type_response;
                side: side_response;
                ratio: ratio_response;
                asset: asset_response;
                index_price: index_price_response;
                mark_price: mark_price_response;
                expiry?: expiry_response;
                strike?: strike_response;
                option_type?: option_type_response;
                iv?: iv_response;
                price_precision: price_precision_response;
            }>;
            block_status: block_status_response;
            created_timestamp: created_timestamp_response;
            deadline: deadline_response;
            orderbook?: {
                /**
                 * Array of 2 elements, price in USD and contract amount e.g. [1650, 1].
                 */
                asks?: Array<asks_response>;
                /**
                 * Array of 2 elements, price in USD and contract amount e.g. [1650, 1].
                 */
                bids?: Array<bids_response>;
            };
            mark_price: mark_price_response;
            amount: amount_response;
            amount_precision: amount_precision_response;
            full_size: full_size_response;
            is_buy?: is_buy_response;
            role?: role_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/rfqs',
            query: {
                'role': role,
            },
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /rfqs
     * Create a new RFQ block.
     * @param requestBody
     * @returns any RFQ block created.
     * @throws ApiError
     */
    public postRfqs(
        requestBody?: {
            legs?: Array<{
                instrument: instrument;
                is_buy: is_buy;
                ratio: ratio;
            }>;
            full_size?: full_size;
            is_buy?: is_buy;
            amount?: amount;
            duration?: duration;
            counterparties?: counterparties;
        },
    ): CancelablePromise<{
        blocks?: Array<{
            block_id: block_id_response;
            legs?: Array<{
                instrument_id: instrument_id_response;
                instrument_name: instrument_name_response;
                instrument_type: instrument_type_response;
                side: side_response;
                ratio: ratio_response;
                asset: asset_response;
                index_price: index_price_response;
                mark_price: mark_price_response;
                expiry?: expiry_response;
                strike?: strike_response;
                option_type?: option_type_response;
                iv?: iv_response;
                price_precision: price_precision_response;
            }>;
            block_status: block_status_response;
            created_timestamp: created_timestamp_response;
            deadline: deadline_response;
            orderbook?: {
                /**
                 * Array of 3 elements, price in USD, contract amount, and IV respectively.
                 */
                bids?: Array<bids_response>;
                /**
                 * Array of 3 elements, price in USD, contract amount, and IV respectively.
                 */
                asks?: Array<asks_response>;
            };
            mark_price: mark_price_response;
            amount: amount_response;
            amount_precision: amount_precision_response;
            full_size: full_size_response;
            is_buy: is_buy_response;
            role?: role_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/rfqs',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * DELETE /rfqs/{block_id}
     * Close an RFQ block
     * @param blockId Block ID is the unique identifier of the block
     * @returns any Block cancellation.
     * @throws ApiError
     */
    public deleteRfqsBlockId(
        blockId: string,
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/rfqs/{block_id}',
            path: {
                'block_id': blockId,
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
     * GET /rfqs/{block_id}/quotes
     * Get the quotes for a given RFQ block.
     * @param blockId Block ID is the unique identifier of the block
     * @returns any List of RFQ quotes.
     * @throws ApiError
     */
    public getRfqsBlockIdQuotes(
        blockId: string,
    ): CancelablePromise<{
        block_id: block_id_response;
        asks?: Array<{
            quote_id: quote_id_response;
            amount: amount_response;
            is_buy: is_buy_response;
            limit_price: limit_price_response;
            legs?: Array<{
                instrument_id: instrument_id_response;
                instrument_name: instrument_name_response;
                side: side_response;
                price: price_response;
                iv?: iv_response;
            }>;
            quote_status: quote_status_response;
            created_timestamp: created_timestamp_response;
        }>;
        bids?: Array<{
            quote_id: quote_id_response;
            amount: amount_response;
            is_buy: is_buy_response;
            limit_price: limit_price_response;
            legs?: Array<{
                instrument_id: instrument_id_response;
                instrument_name: instrument_name_response;
                side: side_response;
                price: price_response;
                iv?: iv_response;
            }>;
            quote_status: quote_status_response;
            created_timestamp: created_timestamp_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/rfqs/{block_id}/quotes',
            path: {
                'block_id': blockId,
            },
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * DELETE /quotes
     * Cancel multiple quotes.
     * @param quoteIds List of quote IDs.
     * @param blockId Block ID is the unique identifier of the block
     * @returns any Quote cancellation status. If any quote were successfully cancelled, they will be found in the `cancelled` field.
     * @throws ApiError
     */
    public deleteQuotes(
        quoteIds?: Array<string>,
        blockId?: string,
    ): CancelablePromise<{
        /**
         * Quote ID is the hash of the quote payload
         */
        cancelled?: Array<quote_id_response>;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/quotes',
            query: {
                'quote_ids': quoteIds,
                'block_id': blockId,
            },
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * GET /quotes
     * Returns all account's quotes.
     * @returns any Quotes.
     * @throws ApiError
     */
    public getQuotes(): CancelablePromise<{
        quotes?: Array<{
            block_id: block_id_response;
            quote_id: quote_id_response;
            amount: amount_response;
            limit_price: limit_price_response;
            quote_status: quote_status_response;
            is_buy: is_buy_response;
            legs?: Array<{
                instrument_id: instrument_id_response;
                instrument_name: instrument_name_response;
                instrument_type: instrument_type_response;
                side: side_response;
                ratio: ratio_response;
                price: price_response;
                asset: asset_response;
                index_price: index_price_response;
                mark_price: mark_price_response;
                expiry?: expiry_response;
                strike?: strike_response;
                option_type?: option_type_response;
                iv?: iv_response;
            }>;
            created_timestamp: created_timestamp_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/quotes',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * POST /quotes
     * Creates a new quote.
     * @param requestBody
     * @returns any Quote created.
     * @throws ApiError
     */
    public postQuotes(
        requestBody?: {
            block_id: block_id;
            account: account;
            amount: amount;
            is_buy: is_buy;
            salt: salt;
            timestamp: timestamp;
            signature: signature;
            legs?: Array<{
                instrument: instrument;
                price: price;
            }>;
            limit_price?: limit_price;
            system_type?: system_type;
        },
    ): CancelablePromise<{
        block_id: block_id_response;
        quote_id: quote_id_response;
        amount: amount_response;
        initial_margin: initial_margin_response;
        filled: filled_response;
        limit_price: limit_price_response;
        quote_status: quote_status_response;
        legs?: Array<{
            instrument_id: instrument_id_response;
            instrument_name: instrument_name_response;
            instrument_type: instrument_type_response;
            side: side_response;
            ratio: ratio_response;
            price: price_response;
            asset: asset_response;
            index_price: index_price_response;
            mark_price: mark_price_response;
            expiry?: expiry_response;
            strike?: strike_response;
            option_type?: option_type_response;
            iv?: iv_response;
        }>;
        avg_price?: avg_price_response;
        created_timestamp: created_timestamp_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/quotes',
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
     * POST /quotes/preview
     * Simulate a new quote.
     * @param requestBody
     * @returns any Quote created.
     * @throws ApiError
     */
    public postQuotesPreview(
        requestBody?: {
            block_id: block_id;
            account: account;
            amount: amount;
            is_buy: is_buy;
            salt: salt;
            timestamp: timestamp;
            signature: signature;
            legs?: Array<{
                instrument: instrument;
                price: price;
            }>;
            limit_price?: limit_price;
            system_type?: system_type;
        },
    ): CancelablePromise<{
        block_id: block_id_response;
        quote_id: quote_id_response;
        amount: amount_response;
        initial_margin: initial_margin_response;
        filled: filled_response;
        limit_price: limit_price_response;
        quote_status: quote_status_response;
        legs?: Array<{
            instrument_id: instrument_id_response;
            instrument_name: instrument_name_response;
            instrument_type: instrument_type_response;
            side: side_response;
            ratio: ratio_response;
            price: price_response;
            asset: asset_response;
            index_price: index_price_response;
            mark_price: mark_price_response;
            expiry?: expiry_response;
            strike?: strike_response;
            option_type?: option_type_response;
            iv?: iv_response;
        }>;
        avg_price?: avg_price_response;
        created_timestamp: created_timestamp_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/quotes/preview',
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
     * DELETE /quotes/{quote_id}
     * Cancels an quote.
     * @param quoteId Quote ID is the hash of the quote payload
     * @returns any Quote cancellation.
     * @throws ApiError
     */
    public deleteQuotesQuoteId(
        quoteId: string,
    ): CancelablePromise<{
        success: success_response;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/quotes/{quote_id}',
            path: {
                'quote_id': quoteId,
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
     * PUT /quotes/{quote_id}
     * Edits an existing quote.
     * @param quoteId Quote ID is the hash of the quote payload
     * @param requestBody
     * @returns any New quote created.
     * @throws ApiError
     */
    public putQuotesQuoteId(
        quoteId: string,
        requestBody?: {
            block_id: block_id;
            account: account;
            amount: amount;
            is_buy: is_buy;
            salt: salt;
            timestamp: timestamp;
            signature: signature;
            legs?: Array<{
                instrument: instrument;
                price: price;
            }>;
            limit_price?: limit_price;
            system_type?: system_type;
        },
    ): CancelablePromise<{
        block_id: block_id_response;
        quote_id: quote_id_response;
        amount: amount_response;
        initial_margin: initial_margin_response;
        filled: filled_response;
        limit_price: limit_price_response;
        quote_status: quote_status_response;
        legs?: Array<{
            instrument_id: instrument_id_response;
            instrument_name: instrument_name_response;
            instrument_type: instrument_type_response;
            side: side_response;
            ratio: ratio_response;
            price: price_response;
            asset: asset_response;
            index_price: index_price_response;
            mark_price: mark_price_response;
            expiry?: expiry_response;
            strike?: strike_response;
            option_type?: option_type_response;
            iv?: iv_response;
        }>;
        avg_price?: avg_price_response;
        created_timestamp: created_timestamp_response;
    }> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/quotes/{quote_id}',
            path: {
                'quote_id': quoteId,
            },
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
     * INTERNAL GET /block-history
     * Return the account's block history.
     * @param blockId Block ID is the unique identifier of the block
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param sortOrder Either ASC or DESC. Default is DESC
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param offset Offset.
     * @returns any Block history.
     * @throws ApiError
     */
    public getBlockHistory(
        blockId?: string,
        startTime?: number,
        endTime?: number,
        sortOrder?: 'ASC' | 'DESC',
        limit?: number,
        offset?: number,
    ): CancelablePromise<{
        count: count_response;
        block_history?: Array<{
            block_id: block_id_response;
            account: account_response;
            duration: duration_response;
            deadline: deadline_response;
            block_status: block_status_response;
            updated_timestamp: updated_timestamp_response;
            created_timestamp: created_timestamp_response;
            legs?: Array<{
                instrument_id: instrument_id_response;
                instrument_name: instrument_name_response;
                instrument_type: instrument_type_response;
                side: side_response;
                ratio: ratio_response;
                asset: asset_response;
                expiry?: expiry_response;
                strike?: strike_response;
                option_type?: option_type_response;
            }>;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/block-history',
            query: {
                'block_id': blockId,
                'start_time': startTime,
                'end_time': endTime,
                'sort_order': sortOrder,
                'limit': limit,
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
     * INTERNAL GET /quote-history
     * Return the account's quote history.
     * @param quoteId Quote ID is the hash of the quote payload
     * @param blockId Block ID is the unique identifier of the block
     * @param role Role of the account
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param sortOrder Either ASC or DESC. Default is DESC
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param offset Offset.
     * @returns any Quote history.
     * @throws ApiError
     */
    public getQuoteHistory(
        quoteId?: string,
        blockId?: string,
        role?: 'taker' | 'maker',
        startTime?: number,
        endTime?: number,
        sortOrder?: 'ASC' | 'DESC',
        limit?: number,
        offset?: number,
    ): CancelablePromise<{
        count: count_response;
        quote_history?: Array<{
            quote_id: quote_id_response;
            block_id: block_id_response;
            account: account_response;
            side: side_response;
            amount: amount_response;
            limit_price: limit_price_response;
            filled: filled_response;
            quote_status: quote_status_response;
            legs?: Array<{
                instrument_id: instrument_id_response;
                instrument_name: instrument_name_response;
                instrument_type: instrument_type_response;
                side: side_response;
                ratio: ratio_response;
                price?: price_response;
                asset: asset_response;
                expiry?: expiry_response;
                strike?: strike_response;
                option_type?: option_type_response;
            }>;
            updated_timestamp: updated_timestamp_response;
            created_timestamp: created_timestamp_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/quote-history',
            query: {
                'quote_id': quoteId,
                'block_id': blockId,
                'role': role,
                'start_time': startTime,
                'end_time': endTime,
                'sort_order': sortOrder,
                'limit': limit,
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
     * INTERNAL GET /block-trade-history
     * Return the account's block trade history.
     * @param blockId Block ID is the unique identifier of the block
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param sortOrder Either ASC or DESC. Default is DESC
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @param offset Offset.
     * @returns any Block trade history.
     * @throws ApiError
     */
    public getBlockTradeHistory(
        blockId?: string,
        startTime?: number,
        endTime?: number,
        sortOrder?: 'ASC' | 'DESC',
        limit?: number,
        offset?: number,
    ): CancelablePromise<{
        count: count_response;
        block_history?: Array<{
            block_trade_id: block_trade_id_response;
            block_id: block_id_response;
            aggressing_quote_id: aggressing_quote_id_response;
            account: account_response;
            side: side_response;
            amount: amount_response;
            price: price_response;
            fees: fees_response;
            created_timestamp: created_timestamp_response;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/block-trade-history',
            query: {
                'block_id': blockId,
                'start_time': startTime,
                'end_time': endTime,
                'sort_order': sortOrder,
                'limit': limit,
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
     * POST /swap
     * Swaps collateral.
     * @param requestBody
     * @returns any Order created.
     * @throws ApiError
     */
    public postSwap(
        requestBody?: {
            collateral_asset: collateral_asset;
            is_buy: is_buy;
            base_amount?: base_amount;
            quote_amount?: quote_amount;
        },
    ): CancelablePromise<{
        order_id: order_id_response;
        account: account_response;
        instrument_id: instrument_id_response;
        instrument_name: instrument_name_response;
        instrument_type: instrument_type_response;
        order_type: order_type_response;
        side: side_response;
        amount: amount_response;
        price: price_response;
        avg_price: avg_price_response;
        filled: filled_response;
        order_status: order_status_response;
        reduce_only?: reduce_only_response;
        initial_margin?: initial_margin_response;
        option_type?: option_type_response;
        iv?: iv_response;
        expiry?: expiry_response;
        strike?: strike_response;
        created_timestamp?: created_timestamp_response;
        timestamp: timestamp_response;
        system_type: system_type_response;
        stop?: stop_response;
        trigger?: trigger_response;
        close_position?: close_position_response;
        isolated_margin?: isolated_margin_response;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/swap',
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
     * INTERNAL GET /analytics
     * Analytics for authenticated accounts
     * @returns any Analytics information.
     * @throws ApiError
     */
    public getAnalytics(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/analytics',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * INTERNAL GET /margin
     * Get the margin requirement.
     * @param instrumentId Instrument ID number.
     * @param isBuy True for long order, false for short order.
     * @param limitPrice Order limit price. In 6 decimals fixed number.
     * @param amount Number of contracts. In 6 decimals fixed number.
     * @param orderId Order ID is the hash of the order payload
     * @returns any Margin requirement.
     * @throws ApiError
     */
    public getMargin(
        instrumentId: number,
        isBuy: boolean,
        limitPrice: string,
        amount: string,
        orderId?: string,
    ): CancelablePromise<{
        initial_margin: initial_margin_response;
        liquidation_price?: liquidation_price_response;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/margin',
            query: {
                'instrument_id': instrumentId,
                'is_buy': isBuy,
                'limit_price': limitPrice,
                'amount': amount,
                'order_id': orderId,
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
     * INTERNAL GET /balance-history
     * Return the account's balance history.
     * @param startTime Entries created prior (<) to start time are excluded in UNIX timestamp in nanoseconds. Defaults to `0`
     * @param endTime Entries created after (>) end time are excluded in UNIX timestamp in nanoseconds. Defaults to current time.
     * @param resolution Interval between entries in seconds. Must be a multiple of 30. Defaults to `30`
     * @returns any Balance history.
     * @throws ApiError
     */
    public getBalanceHistory(
        startTime: number,
        endTime?: number,
        resolution?: number,
    ): CancelablePromise<{
        /**
         * List of [timestamp, price]. Timestamp is in UNIX nanoseconds.
         */
        history?: Array<history_response>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/balance-history',
            query: {
                'start_time': startTime,
                'end_time': endTime,
                'resolution': resolution,
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
     * INTERNAL GET /notifications
     * Returns the account's notification history.
     * @param unread Filter by unread only
     * @param limit Limits the number of relevant entries in the response. Defaults to `50`. Maximum value is `1000`
     * @returns any Notifications.
     * @throws ApiError
     */
    public getNotifications(
        unread?: boolean,
        limit?: number,
    ): CancelablePromise<Array<{
        account: account_response;
        is_read: is_read_response;
        notification_type: notification_type_response;
        created_timestamp: created_timestamp_response;
        metadata?: {
            amount?: amount_response;
            price?: price_response;
            order_type?: order_type_response;
            l1Token?: l1Token_response;
            l2Token?: l2Token_response;
            strike?: strike_response;
            side?: side_response;
            option_type?: option_type_response;
            expiry?: expiry_response;
            account?: account_response;
            collateral?: collateral_response;
            tx_hash?: tx_hash_response;
            to?: to_response;
            balance?: balance_response;
            asset?: asset_response;
            position_count?: position_count_response;
            fees?: fees_response;
            mmp_enabled?: mmp_enabled_response;
            trigger?: trigger_response;
            label?: label_response;
            referee?: referee_response;
            referrer?: referrer_response;
            commission?: commission_response;
            period?: period_response;
            username?: username_response;
            payout?: payout_response;
            entry_price?: entry_price_response;
            transfer_details?: {
                description: description_response;
                link: link_response;
            };
        };
    }>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/notifications',
            query: {
                'unread': unread,
                'limit': limit,
            },
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
    /**
     * INTERNAL POST /mark-as-read
     * Mark the notifications for the account as read.
     * @returns any Read notifications.
     * @throws ApiError
     */
    public postMarkAsRead(): CancelablePromise<Array<{
        account: account_response;
        is_read: is_read_response;
        notification_type: notification_type_response;
        created_timestamp: created_timestamp_response;
        metadata?: {
            amount?: amount_response;
            price?: price_response;
            strike?: strike_response;
            side?: side_response;
            option_type?: option_type_response;
            expiry?: expiry_response;
            account?: account_response;
            collateral?: collateral_response;
            tx_hash?: tx_hash_response;
            to?: to_response;
            balance?: balance_response;
        };
    }>> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/mark-as-read',
            errors: {
                401: `Unauthorized.`,
                429: `Rate limit exceeded.`,
                500: `Internal server error.`,
            },
        });
    }
}
