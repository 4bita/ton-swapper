export type Balance = {
    ton: bigint,
    usdt: bigint,
    usdc: bigint
}

export enum Currency {
    TON = "TON",
    JUSDT = "jUSDT",
    JUSDC = "jUSDC"
}