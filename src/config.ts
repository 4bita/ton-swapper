import { Address } from "@ton/core";
import { PrefferedExchange } from "./types";

export const JUSDT_ADDRESS = Address.parse("EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA");
export const JUSDC_ADDRESS = Address.parse("EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728");
export const PTON_ADDRESS = Address.parse("EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez");


// USDT
export const MIN_JUSDT = 5_000_000n;
export const TARGET_JUSDT = 10_000_000n;
export const MAX_JUSDT = 20_000_000n;

// USDC
export const MIN_JUSDC = 5_000_000n;
export const TARGET_JUSDC = 10_000_000n;
export const MAX_JUSDC = 20_000_000n;

// TON
export const MIN_TON = 10_000_000_000n;

export const MIN_TON_SWAP_AMOUNT = 2_000_000_000n;
export const MIN_JETTON_SWAP_AMOUNT = 5_000_000n;

export const PREFFERED_EXCHANGE = PrefferedExchange.DeDust;
