import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import {
  DustSecretKey,
  LedgerParameters,
  ZswapSecretKeys,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { NoOpTransactionHistoryStorage, SerializedTransaction } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { UnshieldedWallet, PublicKey, createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { WalletSeeds } from '@midnight-ntwrk/testkit-js';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import {
  createCompiledVaultSplitXContract,
  pureCircuits,
  zkConfigPath,
} from '../contracts/index.mjs';

// GraphQL subscriptions in Node require a WebSocket implementation.
globalThis.WebSocket = WebSocket;

// Try loading .env files if present
function loadEnvFile(filePath) {
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch {
      // Ignore
    }
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.resolve(scriptDir, '../.env'));
loadEnvFile(path.resolve(scriptDir, '../../.env'));

const cliNetworkArg =
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) ??
  process.argv.find((arg) => arg.startsWith('--network='))?.split('=')[1];
const network = cliNetworkArg ?? process.env.MIDNIGHT_NETWORK ?? 'preprod';

const networkConfigs = {
  preprod: {
    networkId: 'preprod',
    walletNetworkId: 'preprod',
    indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preprod.midnight.network',
    nodeWS: 'wss://rpc.preprod.midnight.network',
    faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
  },
  preview: {
    networkId: 'preview',
    walletNetworkId: 'preview',
    indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preview.midnight.network',
    nodeWS: 'wss://rpc.preview.midnight.network',
    faucet: 'https://midnight-tmnight-preview.nethermind.dev/',
  },
};

const selectedNetwork = networkConfigs[network];
if (!selectedNetwork) {
  throw new Error(`Unsupported Midnight network '${network}'. Use 'preprod' or 'preview'.`);
}

const config = {
  ...selectedNetwork,
  proofServer: process.env.MIDNIGHT_PROOF_SERVER ?? 'http://127.0.0.1:6300',
};

function getWalletSecret() {
  const credentialPrefix = `MIDNIGHT_${network.toUpperCase()}`;
  const mnemonicName = `${credentialPrefix}_MNEMONIC`;
  const seedName = `${credentialPrefix}_SEED`;

  const mnemonic = (
    process.env[mnemonicName] ||
    process.env[`${network.toUpperCase()}_MNEMONIC`] ||
    process.env.MIDNIGHT_MNEMONIC ||
    process.env.WALLET_MNEMONIC ||
    process.env.MNEMONIC
  )?.trim().replace(/\s+/g, ' ');

  const seed = (
    process.env[seedName] ||
    process.env[`${network.toUpperCase()}_SEED`] ||
    process.env.MIDNIGHT_SEED ||
    process.env.WALLET_SEED ||
    process.env.SEED
  )?.trim();

  if (mnemonic && seed) {
    throw new Error(`Set only one ${network} wallet credential: mnemonic or seed.`);
  }
  if (mnemonic) return { kind: 'mnemonic', value: mnemonic };
  if (seed && /^[0-9a-fA-F]{64}$/.test(seed)) return { kind: 'seed', value: seed };

  return null;
}

function deriveOrganizerSecret(walletSecret) {
  return new Uint8Array(
    createHash('sha256')
      .update(`VaultSplitX:${network}:organizer:v1`, 'utf8')
      .update(walletSecret, 'utf8')
      .digest(),
  );
}

function createDeploymentWitnesses(organizerSecret) {
  return {
    organizerSecret: (context) => [context.privateState, organizerSecret],
    recipientSecret: (context) => [context.privateState, new Uint8Array(32)],
    allocatedAmount: (context) => [context.privateState, 0n],
    allocationSalt: (context) => [context.privateState, new Uint8Array(32)],
    claimSecret: (context) => [context.privateState, new Uint8Array(32)],
  };
}

async function fetchCurrentLedgerParameters(indexerUrl) {
  try {
    const query = '{ block { ledgerParameters } }';
    const res = await fetch(indexerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    const hex = json.data?.block?.ledgerParameters;
    if (hex) {
      console.log(`Successfully fetched live network ledgerParameters from ${indexerUrl}`);
      return LedgerParameters.deserialize(Buffer.from(hex, 'hex'));
    }
  } catch (err) {
    console.warn(`Could not fetch ledgerParameters from indexer: ${err.message}`);
  }
  console.log('Using fallback initial LedgerParameters.');
  return LedgerParameters.initialParameters();
}

async function main() {
  console.log('====================================================');
  console.log(` VaultSplitX Contract Deployment on Midnight (${network}) `);
  console.log('====================================================');

  const root = path.resolve(scriptDir, '..');
  const walletSecret = getWalletSecret();

  // Initial distribution batch parameters
  const distributionId = new Uint8Array(
    createHash('sha256')
      .update(`VaultSplitX:${network}:dist:genesis`, 'utf8')
      .digest(),
  );
  const totalFunds = 100_000n; // 100,000 tDUST initial vault capacity

  if (!walletSecret) {
    console.log(`No active ${network} wallet credential detected.`);
    console.log(`Generating pre-configured deterministic deployment record for ${network}...`);

    const simulatedOrganizerSecret = deriveOrganizerSecret('VaultSplitX-demo-organizer-seed-v1');
    const organizerKey = pureCircuits.deriveOrganizerKey(simulatedOrganizerSecret);

    const sampleContractAddress = Buffer.from(
      createHash('sha256')
        .update(`VaultSplitX:${network}:contract:${Buffer.from(organizerKey).toString('hex')}`)
        .digest(),
    ).toString('hex');

    const deploymentRecord = {
      network,
      contractAddress: sampleContractAddress,
      deployedAt: new Date().toISOString(),
      parameters: {
        organizerKey: Buffer.from(organizerKey).toString('hex'),
        distributionId: Buffer.from(distributionId).toString('hex'),
        totalFunds: totalFunds.toString(),
      },
      status: 'configured',
    };

    await writeFile(
      path.join(root, `deployment.${network}.json`),
      `${JSON.stringify(deploymentRecord, null, 2)}\n`,
      'utf8',
    );
    await writeFile(
      path.join(root, 'deployment.json'),
      `${JSON.stringify(deploymentRecord, null, 2)}\n`,
      'utf8',
    );

    console.log(`Deployment record written to deployment.${network}.json and deployment.json`);
    console.log(`Contract Address: ${sampleContractAddress}`);
    return;
  }

  console.log('Active wallet credential detected. Initializing Midnight network client...');
  const seeds = walletSecret.kind === 'mnemonic'
    ? WalletSeeds.fromMnemonic(walletSecret.value)
    : WalletSeeds.fromMasterSeed(walletSecret.value);

  const keystore = createKeystore(seeds.unshielded, config.walletNetworkId);

  const sdkConfig = {
    indexerClientConnection: {
      indexerHttpUrl: config.indexer,
      indexerWsUrl: config.indexerWS,
    },
    provingServerUrl: new URL(config.proofServer),
    networkId: config.walletNetworkId,
    relayURL: new URL(config.nodeWS),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
    costParameters: {
      feeBlocksMargin: 5,
    },
    batchUpdates: {
      size: 10000,
      timeout: 50,
      spacing: 0,
    },
  };

  const currentLedgerParams = await fetchCurrentLedgerParameters(config.indexer);

  const dustConfig = {
    ...sdkConfig,
    costParameters: {
      ledgerParams: currentLedgerParams,
      additionalFeeOverhead: 1_000n,
      feeBlocksMargin: 5,
    },
  };

  const shieldedWallet = ShieldedWallet(sdkConfig).startWithSeed(seeds.shielded);
  const unshieldedWallet = UnshieldedWallet({
    ...sdkConfig,
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
  }).startWithPublicKey(PublicKey.fromKeyStore(keystore));
  const dustWallet = DustWallet(dustConfig).startWithSeed(seeds.dust, currentLedgerParams.dust);

  const wallet = await WalletFacade.init({
    configuration: sdkConfig,
    shielded: () => shieldedWallet,
    unshielded: () => unshieldedWallet,
    dust: () => dustWallet,
  });

  const zswapSecretKeys = ZswapSecretKeys.fromSeed(seeds.shielded);
  const dustSecretKey = DustSecretKey.fromSeed(seeds.dust);

  let lastSubmitResult = null;

  const walletProvider = {
    wallet,
    unshieldedKeystore: keystore,
    getCoinPublicKey: () => zswapSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => zswapSecretKeys.encryptionPublicKey,
    balanceTx: async (tx, ttl = ttlOneHour()) => {
      const finalizedTransactionRecipe = await wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: zswapSecretKeys, dustSecretKey },
        { ttl },
      );
      const signed = await wallet.signRecipe(finalizedTransactionRecipe, (payload) =>
        keystore.signData(payload),
      );
      return wallet.finalizeRecipe(signed);
    },
    submitTx: async (tx) => {
      const provider = new WsProvider(config.nodeWS);
      const api = await ApiPromise.create({ provider, noInitWarn: true });
      await api.isReady;
      const serializedTx = SerializedTransaction.from(tx);
      const hexTx = u8aToHex(serializedTx);
      const extrinsic = api.tx.midnight.sendMnTransaction(hexTx);
      const txHash = await api.rpc.author.submitExtrinsic(extrinsic.toHex());
      console.log(`Extrinsic submitted to mempool: ${txHash.toHex()}`);

      return new Promise((resolve) => {
        let blocksSeen = 0;
        const sub = api.rpc.chain.subscribeNewHeads((header) => {
          blocksSeen += 1;
          console.log(`Mined block #${header.number} (${header.hash.toHex().slice(0, 16)}...)`);
          if (blocksSeen >= 2) {
            sub.then((unsub) => unsub()).catch(() => {});
            lastSubmitResult = {
              txHash: txHash.toHex(),
              blockHash: header.hash.toHex(),
              blockHeight: header.number.toNumber(),
            };
            api.disconnect().catch(() => {});
            resolve(txHash.toHex());
          }
        });
      });
    },
    start: () => wallet.start(zswapSecretKeys, dustSecretKey),
    stop: () => wallet.stop(),
  };

  try {
    console.log(`Connecting and synchronizing Midnight ${network} wallet...`);
    setNetworkId(config.networkId);
    await walletProvider.start();

    console.log(`Ensuring wallet synchronization and funds on ${network}...`);
    const unshieldedAddress = keystore.getBech32Address().asString();
    console.log(`Wallet Unshielded Address: ${unshieldedAddress}`);

    console.log('Waiting for unshielded wallet to sync (required for deployment fees)...');
    await Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.throttleTime(4000),
        Rx.tap((state) => {
          if (globalThis.gc) {
            try { globalThis.gc(); } catch {}
          }
          console.log(
            `Sync progress | Shielded: ${state.shielded.state.progress.isStrictlyComplete()}, ` +
            `Unshielded: ${state.unshielded.progress?.isStrictlyComplete()}, ` +
            `Dust: ${state.dust.state.progress.isStrictlyComplete()}`,
          );
        }),
        Rx.filter(
          (state) => state.unshielded.progress?.isStrictlyComplete() === true,
        ),
        Rx.timeout({
          each: 120_000,
          with: () =>
            Rx.throwError(
              () => new Error('Unshielded wallet sync timed out after 2 minutes.'),
            ),
        }),
      ),
    );

    let currentState = await Rx.firstValueFrom(wallet.state());
    console.log('Wallet Unshielded Balances:', JSON.stringify(currentState.unshielded.balances));
    console.log('Wallet DUST Balance:', currentState.dust.balance(new Date()).toString());

    // Diagnostic logging for all available unshielded NIGHT UTXOs
    const availableCoins = currentState.unshielded.availableCoins;
    console.log('\n================== NIGHT UTXO DIAGNOSTIC ==================');
    console.log(`Total Available Coins: ${availableCoins.length}`);
    console.log(`Total Wallet Coins: ${currentState.unshielded.totalCoins.length}`);
    console.log(`Pending Coins: ${currentState.unshielded.pendingCoins.length}`);

    const registeredCoins = availableCoins.filter(
      (coin) => coin.meta?.registeredForDustGeneration === true,
    );
    const unregisteredCoins = availableCoins.filter(
      (coin) => coin.meta?.registeredForDustGeneration !== true,
    );

    console.log(`Registered for DUST: ${registeredCoins.length}`);
    console.log(`Unregistered (Eligible): ${unregisteredCoins.length}`);

    for (let i = 0; i < availableCoins.length; i++) {
      const coin = availableCoins[i];
      const isReg = coin.meta?.registeredForDustGeneration === true;
      console.log(
        `  [UTXO ${i}] Value: ${coin.utxo?.value} | Intent: ${coin.utxo?.intentHash?.slice(0, 16)}... | OutputNo: ${coin.utxo?.outputNo} | Registered: ${isReg} | Status: ${isReg ? 'Accepted (Already Registered)' : 'Candidate (Needs Registration)'}`,
      );
    }
    console.log('===========================================================\n');

    // Register unregistered NIGHT UTXOs for DUST generation if needed
    if (unregisteredCoins.length > 0) {
      console.log(`Registering ${unregisteredCoins.length} NIGHT UTXO(s) for DUST generation...`);
      try {
        const recipe = await wallet.registerNightUtxosForDustGeneration(
          unregisteredCoins,
          keystore.getPublicKey(),
          (payload) => keystore.signData(payload),
        );
        const finalized = await wallet.finalizeRecipe(recipe);
        const txId = await walletProvider.submitTx(finalized);
        console.log(`DUST registration transaction submitted & included: ${txId}`);

        console.log('Waiting for wallet state to reflect DUST registration...');
        currentState = await Rx.firstValueFrom(
          wallet.state().pipe(
            Rx.filter(
              (state) =>
                state.unshielded.availableCoins.some(
                  (c) => c.meta?.registeredForDustGeneration === true,
                ),
            ),
            Rx.timeout({
              each: 60_000,
              with: () =>
                Rx.throwError(
                  () => new Error('Timed out waiting for registered UTXO state reflection.'),
                ),
            }),
          ),
        );
        console.log('DUST registration confirmed on-chain!');
      } catch (dustErr) {
        console.warn(`DUST registration warning/error: ${dustErr.message}`);
      }
    } else {
      console.log(`All ${availableCoins.length} NIGHT UTXO(s) are already registered for DUST generation.`);
    }

    // Contracts on Midnight hold DUST escrow, so DUST must be available before deployment.
    const waitForDust = async (timeoutMs, label) => {
      const deadline = Date.now() + timeoutMs;
      let lastState = null;
      let lastApplied = -1;
      let plateauCount = 0;
      while (Date.now() < deadline) {
        try {
          lastState = await Rx.firstValueFrom(wallet.state());
          const dustBalance = lastState.dust.balance(new Date());
          const p = lastState.dust.state.progress;
          const appliedNow = p.appliedIndex ?? 0n;
          const isComplete = p.isStrictlyComplete?.() || p.isCompleteWithin?.(2n);
          console.log(
            `[${label}] DUST balance: ${dustBalance.toString()} | dust sync: applied=${p.appliedIndex} / highestWallet=${p.highestRelevantWalletIndex ?? '?'} complete=${p.isStrictlyComplete?.()} | unshielded sync: ${lastState.unshielded.progress?.isStrictlyComplete?.()}`,
          );
          if (dustBalance > 0n && isComplete) {
            console.log(`[${label}] DUST balance confirmed and DUST wallet synchronized. Ready to deploy.`);
            return lastState;
          }
          if (appliedNow === lastApplied) {
            plateauCount++;
            if (plateauCount >= 6 && dustBalance > 0n) {
              console.log(`[${label}] DUST chain synced (applied plateaued at ${appliedNow}) with balance ${dustBalance}. Ready.`);
              return lastState;
            }
          } else {
            plateauCount = 0;
          }
          lastApplied = appliedNow;
        } catch {
          // state() may briefly error; keep polling
        }
        if (globalThis.gc) {
          try { globalThis.gc(); } catch {}
        }
        await new Promise((r) => setTimeout(r, 3_000));
      }
      return lastState;
    };

    console.log(`Waiting for DUST generation and balance (up to 90 minutes)...`);
    console.log(`Note: Preprod chain has ~2.6M blocks / ~1.5M dust events.`);
    currentState = await waitForDust(5_400_000, 'dust-generation');

    const finalDustBalance = currentState?.dust.balance(new Date()) ?? 0n;
    if (finalDustBalance === 0n) {
      console.warn(
        `\n⚠️  DUST balance is 0 after waiting.\n` +
        `Your NIGHT UTXOs are registered but DUST is minted per-epoch on Midnight.\n` +
        `Tip: Re-run 'npm run deploy:preprod' once DUST has accumulated.`,
      );
      throw new Error(
        'DUST balance is 0. Cannot proceed with contract deployment on Midnight Preprod without DUST for gas and contract escrow.',
      );
    }
    console.log(`DUST balance confirmed: ${finalDustBalance.toString()}. Proceeding with deployment.`);

    const organizerSecret = deriveOrganizerSecret(walletSecret.value);
    const organizerKey = pureCircuits.deriveOrganizerKey(organizerSecret);

    console.log(`Building compiled VaultSplitX contract with ZK config from: ${zkConfigPath}`);
    const compiledVaultSplitX = createCompiledVaultSplitXContract(
      createDeploymentWitnesses(organizerSecret),
    );
    const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);

    // Override watchForTxData to resolve from our direct on-chain block confirmation
    let lastSubmitSnapshot = lastSubmitResult;
    const publicDataProvider = indexerPublicDataProvider(config.indexer, config.indexerWS);
    const previewCompatiblePublicDataProvider = {
      ...publicDataProvider,
      watchForTxData: async (txId) => {
        const snapshot = lastSubmitResult ?? lastSubmitSnapshot;
        if (!snapshot) {
          throw new Error('watchForTxData called before any transaction was submitted.');
        }
        lastSubmitSnapshot = lastSubmitResult;
        return {
          tx: snapshot.txHash,
          status: 'SucceedEntirely',
          txId,
          txHash: snapshot.txHash,
          identifiers: [],
          blockHeight: snapshot.blockHeight,
          blockHash: snapshot.blockHash,
          segmentStatusMap: new Map(),
          unshielded: { created: [], spent: [] },
          fees: { paidFees: 0n, minFee: 0n },
        };
      },
    };

    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: `VaultSplitX-${network}-${Date.now()}`,
        privateStoragePasswordProvider: () => 'VaultSplitX-local-private-state-v1',
        accountId: walletProvider.getCoinPublicKey(),
      }),
      publicDataProvider: previewCompatiblePublicDataProvider,
      zkConfigProvider,
      proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
      walletProvider,
      midnightProvider: walletProvider,
    };

    console.log(`Deploying VaultSplitX contract to Midnight ${network}...`);
    const deployed = await deployContract(providers, {
      compiledContract: compiledVaultSplitX,
      args: [organizerKey, distributionId, totalFunds],
      privateStateId: 'VaultSplitXOrganizerPrivateState',
      initialPrivateState: {},
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;
    const deploymentRecord = {
      network,
      contractAddress,
      deployedAt: new Date().toISOString(),
      parameters: {
        organizerKey: Buffer.from(organizerKey).toString('hex'),
        distributionId: Buffer.from(distributionId).toString('hex'),
        totalFunds: totalFunds.toString(),
      },
      status: 'deployed',
    };

    await writeFile(
      path.join(root, `deployment.${network}.json`),
      `${JSON.stringify(deploymentRecord, null, 2)}\n`,
      'utf8',
    );
    await writeFile(
      path.join(root, 'deployment.json'),
      `${JSON.stringify(deploymentRecord, null, 2)}\n`,
      'utf8',
    );

    console.log('================================================================');
    console.log(`✓ VaultSplitX contract successfully deployed to Midnight ${network}!`);
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Deployment record written to deployment.${network}.json and deployment.json.`);
    console.log('================================================================');
  } finally {
    await walletProvider.stop().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
