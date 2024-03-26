import { getHttpEndpoint, getHttpV4Endpoint } from "@orbs-network/ton-access";
import { TonClient, TonClient4, WalletContractV4 } from "@ton/ton";
import { mnemonicToWalletKey } from "@ton/crypto";
import { configDotenv } from "dotenv";
import { getBalance, sleepMs } from "./helpers";
import * as dedust from "./dedust";
import * as stonfi from "./stonfi";
import { Currency, PrefferedExchange } from "./types";
import {
    MAX_JUSDC,
    MAX_JUSDT,
    MIN_JETTON_SWAP_AMOUNT,
    MIN_JUSDC,
    MIN_JUSDT,
    MIN_TON,
    MIN_TON_SWAP_AMOUNT,
    PREFFERED_EXCHANGE,
    TARGET_JUSDC,
    TARGET_JUSDT
} from "./config";

const MINUTELY = 60_000
const TON_PRICE_IN_USD = 5.05
const TON_USD_SCALE = BigInt(Math.floor(1000 / TON_PRICE_IN_USD))


async function main() {
    await handleSwap();
    setInterval(() => {
        handleSwap().catch((e) => {
            console.log(`Failed with error: ${e}`);
        });
    }, MINUTELY);
}


async function handleSwap() {
    // Use Orbs RPC provider
    // V2 is used to get jetton balance
    const endpointV2 = await getHttpEndpoint();
    const tonClientV2 = new TonClient({ endpoint: endpointV2 });
    // V4 has to be used for exchanges API
    const endpointV4 = await getHttpV4Endpoint();
    const tonClientV4 = new TonClient4({ endpoint: endpointV4 });

    const keys = await mnemonicToWalletKey(
        process.env.WALLET_PRIVATE_KEY.split(" ")
    );
    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keys.publicKey,
    });
    const myBalance = await getBalance(tonClientV2, wallet);
    console.log("My balance: ", myBalance);

    if (myBalance.ton < MIN_TON) {
        console.log(`Not enough TON balance. To handle swaps at least ${MIN_TON} Ton required`);
        return;
    }
    let fromCurrency = Currency.TON;
    let toCurrency = Currency.TON;
    let amount = 0n;
    if (myBalance.
        usdt > MAX_JUSDT) {
        console.log("Too a lot of USDT. Swap surplus to TON.");
        fromCurrency = Currency.JUSDT;
        toCurrency = Currency.TON;
        amount = myBalance.usdt - TARGET_JUSDT;
    } else if (myBalance.usdt < MIN_JUSDT) {
        console.log("Not enough USDT. Buy some.");
        fromCurrency = Currency.TON;
        toCurrency = Currency.JUSDT;
        amount = (TARGET_JUSDT - myBalance.usdt) * TON_USD_SCALE;
    } else if (myBalance.usdc > MAX_JUSDC) {
        console.log("Too a lot of USDC. Swap surplus to TON.");
        fromCurrency = Currency.JUSDC;
        toCurrency = Currency.TON;
        amount = myBalance.usdc - TARGET_JUSDC;
    } else if (myBalance.usdc < MIN_JUSDC) {
        console.log("Not enough USDC. Buy some.");
        fromCurrency = Currency.TON;
        toCurrency = Currency.JUSDC;
        amount = (TARGET_JUSDC - myBalance.usdc) * TON_USD_SCALE;
    }

    if ((fromCurrency === Currency.TON && amount > MIN_TON_SWAP_AMOUNT) ||
        (fromCurrency !== Currency.TON && amount > MIN_JETTON_SWAP_AMOUNT)) {
        console.log(`Swap ${fromCurrency} -> ${toCurrency}. Amount: ${amount}`);

        const exchangeApi = await chooseExchange(tonClientV4, fromCurrency, toCurrency, amount);

        for (let i = 0; i < 3; i++) {
            try {
                await exchangeApi.swap(
                    tonClientV4,
                    wallet,
                    keys,
                    fromCurrency,
                    toCurrency,
                    amount
                );
                console.log("Successfully swapped");
                break;
            } catch (e) {
                console.log("Swap failed. Try to retry it one more time");
                await sleepMs(1000);
            }
        }
    } else {
        console.log("Rebalancing is not required...");
    }
}


async function chooseExchange(tonClient: TonClient4, from: Currency, to: Currency, amountIn: bigint) {
    if (PREFFERED_EXCHANGE.valueOf() === PrefferedExchange.DeDust) {
        console.log("Use DeDust api for exchanging as it is set as preferred one");
        return dedust;
    }
    if (PREFFERED_EXCHANGE.valueOf() === PrefferedExchange.StonFi) {
        console.log("Use Ston.fi api for exchanging as it is set as preferred one.");
        return stonfi;
    }

    const dedustFee = await dedust.estimateSwapPrise(tonClient, from, to, amountIn);
    const stonfiFee = await stonfi.estimateSwapPrise(from, to, amountIn);
    if (dedustFee.tradeFee <= stonfiFee.tradeFee) {
        console.log("Use DeDust api for exchanging. Estimated fee: ", dedustFee.tradeFee);
        return dedust;
    }
    console.log("Use Ston.fi api for exchanging");
    return stonfi;
}


(() => {
    configDotenv();
    main().catch(e => {console.error(`Failed with ${e}`)});
})();
