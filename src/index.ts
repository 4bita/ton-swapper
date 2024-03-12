import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient, WalletContractV4 } from "@ton/ton";
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
const TON_USD_SCALE = 270n


async function main() {
    await handleSwap();
    setInterval(() => {
        handleSwap().catch((e) => {
            console.log(`Failed with error: ${e}`);
        });
    }, MINUTELY);
}


async function handleSwap() {
    //Use Orbs RPC provider
    const endpoint = await getHttpEndpoint();
    const tonClient = new TonClient({ endpoint });
    const keys = await mnemonicToWalletKey(
        process.env.WALLET_PRIVATE_KEY.split(" ")
    );
    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keys.publicKey,
    });
    const myBalance = await getBalance(tonClient, wallet);
    console.log("My balance: ", myBalance);

    if (myBalance.ton < MIN_TON) {
        console.log(`Not enough TON balance. To handle swaps at least ${MIN_TON} Ton required`);
        return;
    }
    let fromCurrency = Currency.TON;
    let toCurrency = Currency.TON;
    let amount = 0n;
    if (myBalance.usdt > MAX_JUSDT) {
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

        const exchangeApi = await chooseExchange(fromCurrency, toCurrency, amount);

        for (let i = 0; i < 3; i++) {
            try {
                await exchangeApi.swap(
                    wallet,
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


async function chooseExchange(from: Currency, to: Currency, amountIn: bigint) {
    // @ts-ignore
    if (PREFFERED_EXCHANGE === PrefferedExchange.DeDust) {
        console.log("Use DeDust api for exchanging as it is set as preferred one");
        return dedust
    }
    if (PREFFERED_EXCHANGE === PrefferedExchange.StonFi) {
        console.log("Use Ston.fi api for exchanging as it is set as preferred one.");
        return stonfi
    }

    const dedustFee = await dedust.estimateSwapPrise(from, to, amountIn);
    const stonfiFee = await stonfi.estimateSwapPrise(from, to, amountIn);
    if (dedustFee.tradeFee <= stonfiFee.tradeFee) {
        console.log("Use DeDust api for exchanging");
        return dedust;
    }
    console.log("Use Ston.fi api for exchanging");
    return stonfi;
}


(() => {
    configDotenv();
    main()
        .catch(e => {console.error(`Failed with ${e}`)})
        .finally(() => console.log("Exiting..."));
})();
