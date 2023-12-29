import TonWeb from 'tonweb';
import { beginCell, internal, SendMode, toNano, TonClient, WalletContractV4 } from "@ton/ton";
import { Router, ROUTER_REVISION, ROUTER_REVISION_ADDRESS } from '@ston-fi/sdk';
import { JUSDC_ADDRESS, JUSDT_ADDRESS, PTON_ADDRESS } from "./config";
import { Currency } from "./types";
import { mnemonicToWalletKey } from "@ton/crypto";

const CurrencyAssets = {
    [Currency.TON]: PTON_ADDRESS,
    [Currency.JUSDC]: JUSDC_ADDRESS,
    [Currency.JUSDT]: JUSDT_ADDRESS,
}


export async function swap(
    tonClient: TonClient,
    wallet: WalletContractV4,
    from: Currency,
    to: Currency,
    amountIn: bigint
){
    const fromAddr = CurrencyAssets[from].toString();
    const toAddr = CurrencyAssets[to].toString();

    const provider = new TonWeb.HttpProvider(process.env.API_URL,{apiKey: process.env.API_KEY});
    const router = new Router(provider, {
        revision: ROUTER_REVISION.V1,
        address: ROUTER_REVISION_ADDRESS.V1,
    });

    const params = await router.buildSwapProxyTonTxParams({
        userWalletAddress: wallet.address.toString(),
        proxyTonAddress: fromAddr,
        offerAmount: new TonWeb.utils.BN(amountIn),
        askJettonAddress: toAddr,
        minAskAmount: new TonWeb.utils.BN(1),
    });

    const walletContract = tonClient.open(wallet);
    const seqno = await walletContract.getSeqno();
    const keys = await mnemonicToWalletKey(process.env.WALLET_PRIVATE_KEY.split(' '));

    const buffer = Buffer.from(params.payload.bits.toHex(), 'hex');
    await walletContract.sendTransfer(
        {
        secretKey: keys.secretKey,
        seqno: seqno,
        messages: [
             internal({
                 value: params.gasAmount,
                 to: params.to.toString(),
                 body: beginCell().storeBuffer(buffer).endCell(),
             })
        ],
        sendMode: SendMode.PAY_GAS_SEPARATELY,
    });
}


export async function estimateSwapPrise(
    tonClient: TonClient,
    from: Currency,
    to: Currency,
    amountIn: bigint
) {
    const fromAddr = CurrencyAssets[from].toString();
    const toAddr = CurrencyAssets[to].toString();

    const provider = new TonWeb.HttpProvider(process.env.API_URL,{apiKey: process.env.API_KEY});
    const router = new Router(provider, {
        revision: ROUTER_REVISION.V1,
        address: ROUTER_REVISION_ADDRESS.V1,
    });
    const pool = await router.getPool({ jettonAddresses: [fromAddr, toAddr] });
    const poolData = await pool.getData();
    if (poolData.token0WalletAddress) {
        const { jettonToReceive, protocolFeePaid } = await pool.getExpectedOutputs({
            amount: new TonWeb.utils.BN(amountIn),
            jettonWallet: poolData.token0WalletAddress,
        });
        return {
            amountOut: jettonToReceive.toNumber(),
            tradeFee: protocolFeePaid.toNumber(),
        }
    }
}
