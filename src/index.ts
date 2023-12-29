import {getHttpEndpoint} from "@orbs-network/ton-access";
import {TonClient, WalletContractV4} from "@ton/ton";
import {mnemonicToWalletKey} from "@ton/crypto";
import {configDotenv} from "dotenv";
import {getBalance} from "./helpers";
import * as dedust from "./dedust";
import * as stonfi from "./stonfi";
import {Currency} from "./types";
import {
    MAX_JUSDC,
    MAX_JUSDT,
    MIN_JETTON_SWAP_AMOUNT,
    MIN_JUSDC,
    MIN_JUSDT,
    MIN_TON,
    MIN_TON_SWAP_AMOUNT,
    TARGET_JUSDC,
    TARGET_JUSDT
} from "./config";

const HOUR = 3_600_000
const TON_USD_SCALE = 500n


async function main() {
    const endpoint = await getHttpEndpoint();
    const tonClient = new TonClient({ endpoint });
    const keys = await mnemonicToWalletKey(
        process.env.WALLET_PRIVATE_KEY.split(" ")
    );
    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keys.publicKey,
    });

    await handleSwap(tonClient, wallet);
    setInterval(() => {
        handleSwap(tonClient, wallet).catch((e) => {
            console.log(`Failed with error: ${e}`);
        });
    }, HOUR);
}


async function handleSwap(tonClient: TonClient, wallet: WalletContractV4) {
    const myBalance = await getBalance(tonClient, wallet);
    console.log("My balance: ", myBalance);

    if (myBalance.ton < MIN_TON) {
        console.log("Not enough TON balance");
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

        const exchangeApi = await chooseExchange(tonClient, fromCurrency, toCurrency, amount);

        await exchangeApi.swap(
            tonClient,
            wallet,
            fromCurrency,
            toCurrency,
            amount
        )
        console.log("Successfully swapped")
    } else {
        console.log("Rebalancing is not required...")
    }
}


async function chooseExchange(tonClient: TonClient, from: Currency, to: Currency, amountIn: bigint) {
    const dedustFee = await dedust.estimateSwapPrise(tonClient, from, to, amountIn);
    const stonfiFee = await stonfi.estimateSwapPrise(tonClient, from, to, amountIn);

    if (dedustFee.tradeFee <= stonfiFee.tradeFee) {
        console.log("Use DeDust api for exchanging")
        return dedust;
    }
    // Use DeDust in all cases for now as StonFi doesn't work as expected. Should be changed in the future.
    console.log("Use DeDust api for exchanging")
    return dedust;
}


(() => {
    configDotenv();
    main()
        .catch(e => {console.error(`Failed with ${e}`)})
        .finally(() => console.log("Exiting..."));
})();
