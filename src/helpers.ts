import { Address, JettonMaster, TonClient, WalletContractV4 } from "@ton/ton";
import { Balance } from "./types";
import { JUSDC_ADDRESS, JUSDT_ADDRESS } from "./config";


async function getJettonBalance(tonClient: TonClient, wallet: WalletContractV4, jettonMasterAddress: Address): Promise<bigint>  {
    try {
        const userAddress = wallet.address;
        const jettonMaster = tonClient.open(JettonMaster.create(jettonMasterAddress));
        const jettonAddress = await jettonMaster.getWalletAddress(userAddress);
        const res = await tonClient.runMethod(jettonAddress, 'get_wallet_data');
        return res.stack.readBigNumber();
    } catch (e) {
        if (e.message === "Unable to execute get method. Got exit_code: -13") {
            return 0n;
        }
        throw e;
    }
}

export async function getBalance(tonClient: TonClient, wallet: WalletContractV4): Promise<Balance> {
    const balance = {
        ton: 0n,
        usdt: 0n,
        usdc: 0n,
    };

    balance.ton = await tonClient.getBalance(wallet.address);
    balance.usdc = await getJettonBalance(tonClient, wallet, JUSDC_ADDRESS);
    balance.usdt = await getJettonBalance(tonClient, wallet, JUSDT_ADDRESS);
    return balance;
}

export async function sleepMs(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
