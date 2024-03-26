import { Asset, Factory, JettonRoot, MAINNET_FACTORY_ADDR, PoolType, ReadinessStatus, VaultJetton } from '@dedust/sdk';
import { toNano, TonClient4, WalletContractV4 } from "@ton/ton";
import { KeyPair } from "@ton/crypto";
import { JUSDC_ADDRESS, JUSDT_ADDRESS } from "./config";
import { Currency } from "./types";

const CurrencyAssets = {
    [Currency.TON]: Asset.native(),
    [Currency.JUSDC]: Asset.jetton(JUSDC_ADDRESS),
    [Currency.JUSDT]: Asset.jetton(JUSDT_ADDRESS),
};


export async function swap(
    tonClient: TonClient4,
    wallet: WalletContractV4,
    keyPair: KeyPair,
    from: Currency,
    to: Currency,
    amountIn: bigint
){
    const fromAsset = CurrencyAssets[from];
    const toAsset = CurrencyAssets[to];

    const vault = await getVault(tonClient, fromAsset);
    const pool = await findPool(tonClient, fromAsset, toAsset);
    const sender = tonClient.open(wallet).sender(keyPair.secretKey);

    if(fromAsset.type === 0){
        await vault.sendSwap(sender, {
            poolAddress: pool.address,
            amount: amountIn,
            gasAmount: toNano("0.25"),
        });
    } else {
        const fromAssetRoot = tonClient.open(JettonRoot.createFromAddress(fromAsset.address));
        const fromAssetWallet = tonClient.open(await fromAssetRoot.getWallet(wallet.address));
        await fromAssetWallet.sendTransfer(sender, toNano("0.3"), {
            amount: amountIn,
            destination: vault.address,
            responseAddress: sender.address,
            forwardAmount: toNano("0.25"),
            forwardPayload: VaultJetton.createSwapPayload({poolAddress: pool.address}),
        });
    }
}


export async function estimateSwapPrise(
    tonClient: TonClient4,
    from: Currency,
    to: Currency,
    amountIn: bigint
) {
    const fromAsset = CurrencyAssets[from];
    const toAsset = CurrencyAssets[to];
    const pool = await findPool(tonClient, fromAsset, toAsset);
    const { assetOut, amountOut, tradeFee } = await pool.getEstimatedSwapOut(
        { assetIn: fromAsset, amountIn: amountIn }
    );
    return { assetOut, amountOut, tradeFee };
}


async function findPool(tonClient: TonClient4, fromAsset: Asset, toAsset: Asset) {
    const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR));
    const poolType = (fromAsset.type === 0 || toAsset.type === 0) ? PoolType.VOLATILE : PoolType.STABLE;
    const pool = tonClient.open(await factory.getPool(poolType, [fromAsset, toAsset]));

    if ((await pool.getReadinessStatus()) !== ReadinessStatus.READY) {
        throw new Error(`Pool (${fromAsset}, ${toAsset}) does not exist.`);
    }
    return pool;
}


async function getVault(tonClient: TonClient4, asset: Asset) {
    const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR));
    let vault;
    if (asset.type === 0){
        const tonVault = await factory.getNativeVault();
        vault = tonClient.open(tonVault);
    } else {
        const jettonVault = await factory.getJettonVault(asset.address);
        vault = tonClient.open(jettonVault);
    }

    if ((await vault.getReadinessStatus()) !== ReadinessStatus.READY) {
        throw new Error('Vault does not exist.');
    }
    return vault;
}
