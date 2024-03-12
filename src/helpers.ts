import { Address, JettonMaster, TonClient, WalletContractV4 } from "@ton/ton";
import { Balance } from "./types";
import { JUSDC_ADDRESS, JUSDT_ADDRESS } from "./config";

const TONAPI_URL = "https://tonapi.io/v2/accounts"

async function getJettonBalance(tonClient: TonClient, wallet: WalletContractV4, jettonMasterAddress: Address): Promise<bigint>  {
    const userAddress = wallet.address;
    const jettonMaster = tonClient.open(JettonMaster.create(jettonMasterAddress));
    const jettonAddress = await jettonMaster.getWalletAddress(userAddress)
    const res = await tonClient.runMethod(jettonAddress, 'get_wallet_data')
    return res.stack.readBigNumber();
}


async function getJettonBalanceV2(tonClient: TonClient, wallet: WalletContractV4, jettonMasterAddress: Address): Promise<bigint>  {
    const res = await fetch(`${TONAPI_URL}/${wallet.address.toRawString()}/jettons?currencies=usd`);
    const data = await res.json()
    for (var balance of data["balances"]){
        if (balance["jetton"]["address"] === jettonMasterAddress.toRawString()) {
            return BigInt(balance["balance"]);
        }
    }
    return 0n;
}


export async function getBalance(tonClient: TonClient, wallet: WalletContractV4): Promise<Balance> {
    const balance = {
        ton: 0n,
        usdt: 0n,
        usdc: 0n,
    };

    balance.ton = await tonClient.getBalance(wallet.address);
    balance.usdc = await getJettonBalance(tonClient, wallet, JUSDC_ADDRESS);
    balance.usdt = await getJettonBalanceV2(tonClient, wallet, JUSDT_ADDRESS);
    return balance;
}

export async function sleepMs(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
