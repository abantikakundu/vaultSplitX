import { createHash } from 'node:crypto';
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
import { FluentWalletBuilder, waitForFunds } from '@midnight-ntwrk/testkit-js';
import {
  createCompiledVaultSplitXContract,
  pureCircuits,
  zkConfigPath,
} from '../contracts/index.mjs';

// GraphQL subscriptions in Node require a WebSocket implementation.
globalThis.WebSocket = WebSocket;

const network = process.env.MIDNIGHT_NETWORK ?? 'preprod';
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
  const mnemonic = process.env[mnemonicName]?.trim().replace(/\s+/g, ' ');
  const seed = process.env[seedName]?.trim();

  if (mnemonic && seed) {
    throw new Error(`Set only one ${network} wallet credential: mnemonic or seed.`);
  }
  if (mnemonic) return { kind: 'mnemonic', value: mnemonic };
  if (seed && /^[0-9a-fA-F]{64}$/.test(seed)) return { kind: 'seed', value: seed };
  throw new Error(`${seedName} must be a 64-character hex value, or configure ${mnemonicName}.`);
}

function progressComplete(progress) {
  return Boolean(progress && typeof progress.isStrictlyComplete === 'function' && progress.isStrictlyComplete());
}

function formatProgress(progress) {
  if (!progress || typeof progress !== 'object') return 'unknown';
  const applied = progress.appliedIndex ?? progress.appliedId;
  const target = progress.highestRelevantWalletIndex ?? progress.highestTransactionId;
  if (applied === undefined || target === undefined) {
    return progressComplete(progress) ? 'complete' : 'pending';
  }
  return `${progressComplete(progress) ? 'complete' : 'pending'} (${applied}/${target})`;
}

async function waitForWalletSync(
  wallet,
  timeout = Number(process.env.MIDNIGHT_SYNC_TIMEOUT_MS ?? 4 * 60 * 60_000),
) {
  let emissionCount = 0;
  await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state) => {
        emissionCount += 1;
        if (emissionCount !== 1 && emissionCount % 1_000 !== 0) return;
        console.log(
          `Wallet sync #${emissionCount}: ` +
          `shielded=${formatProgress(state.shielded.state.progress)}, ` +
          `dust=${formatProgress(state.dust.state.progress)}, ` +
          `unshielded=${formatProgress(state.unshielded.progress)}`,
        );
      }),
      Rx.filter((state) =>
        progressComplete(state.shielded.state.progress) &&
        progressComplete(state.dust.state.progress) &&
        progressComplete(state.unshielded.progress),
      ),
      Rx.timeout({
        each: timeout,
        with: () => Rx.throwError(
          () => new Error(`Wallet sync timed out after ${Math.round(timeout / 60_000)} minutes.`),
        ),
      }),
    ),
  );
}

async function buildWallet(secret) {
  const dustOptions = {
    ledgerParams: LedgerParameters.initialParameters(),
    additionalFeeOverhead: 1_000n,
    feeBlocksMargin: 5,
  };
  const base = FluentWalletBuilder.forEnvironment(config).withDustOptions(dustOptions);
  const builder = secret.kind === 'mnemonic'
    ? base.withMnemonic(secret.value)
    : base.withSeed(secret.value);
  const { wallet, seeds, keystore } = await builder.buildWithoutStarting();
  const zswapSecretKeys = ZswapSecretKeys.fromSeed(seeds.shielded);
  const dustSecretKey = DustSecretKey.fromSeed(seeds.dust);

  return {
    wallet,
    unshieldedKeystore: keystore,
    getCoinPublicKey: () => zswapSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => zswapSecretKeys.encryptionPublicKey,
    balanceTx: async (tx, ttl = ttlOneHour()) => {
      const recipe = await wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: zswapSecretKeys, dustSecretKey },
        { ttl },
      );
      return wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx) => wallet.submitTransaction(tx),
    start: () => wallet.start(zswapSecretKeys, dustSecretKey),
    stop: () => wallet.stop(),
  };
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

const walletSecret = getWalletSecret();
const wallet = await buildWallet(walletSecret);

try {
  console.log(`Starting and synchronizing the ${network} wallet...`);
  setNetworkId(config.networkId);
  await wallet.start();
  await waitForWalletSync(wallet.wallet);

  console.log('Ensuring wallet is funded with tNIGHT/DUST...');
  await waitForFunds(wallet.wallet, config, false, wallet.unshieldedKeystore);

  const organizerSecret = deriveOrganizerSecret(walletSecret.value);
  const organizerKey = pureCircuits.deriveOrganizerKey(organizerSecret);

  // Generate initial distribution batch ID (deterministic domain hash)
  const distributionId = new Uint8Array(
    createHash('sha256')
      .update(`VaultSplitX:${network}:dist:genesis`, 'utf8')
      .digest(),
  );
  const totalFunds = 100_000n; // 100,000 tDUST initial vault capacity

  const compiledVaultSplitXContract = createCompiledVaultSplitXContract(
    createDeploymentWitnesses(organizerSecret),
  );
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: `VaultSplitX-${network}-${Date.now()}`,
      privateStoragePasswordProvider: () => 'VaultSplitX-local-private-state-v1',
      accountId: wallet.getCoinPublicKey(),
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: wallet,
    midnightProvider: wallet,
  };

  console.log(`Submitting VaultSplitX deployment transaction to Midnight ${network}...`);
  const deployed = await deployContract(providers, {
    compiledContract: compiledVaultSplitXContract,
    args: [organizerKey, distributionId, totalFunds],
    privateStateId: 'VaultSplitXOrganizerPrivateState',
    initialPrivateState: {},
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  await writeFile(
    path.join(root, `deployment.${network}.json`),
    `${JSON.stringify({ network, contractAddress, deployedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );

  console.log('================================================================');
  console.log(`✓ VaultSplitX successfully deployed to Midnight ${network}!`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployment record written to deployment.${network}.json.`);
  console.log('================================================================');
} finally {
  await wallet.stop().catch(() => undefined);
}
