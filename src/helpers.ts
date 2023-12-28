import { Address, JettonMaster, TonClient, WalletContractV4 } from "@ton/ton";
import { Balance } from "./types";
import { JUSDC_ADDRESS, JUSDT_ADDRESS } from "./config";


async function getJettonBalance(tonClient: TonClient, wallet: WalletContractV4, jettonMasterAddress: Address): Promise<bigint>  {
    const userAddress = wallet.address;
    const jettonMaster = tonClient.open(JettonMaster.create(jettonMasterAddress));
    const jettonAddress = await jettonMaster.getWalletAddress(userAddress)
    const res = await tonClient.runMethod(jettonAddress, 'get_wallet_data')
    return res.stack.readBigNumber();
}


export async function getBalance(tonClient: TonClient, wallet: WalletContractV4): Promise<Balance> {
    const balance = {
        ton: 0n,
        usdt: 0n,
        usdc: 0n,
    };

    balance.ton = await tonClient.getBalance(wallet.address);
    balance.usdt = await getJettonBalance(tonClient, wallet, JUSDT_ADDRESS);
    balance.usdc = await getJettonBalance(tonClient, wallet, JUSDC_ADDRESS);
    return balance;
}
