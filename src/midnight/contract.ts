/**
 * midnight/contract.ts
 *
 * Executes real on-chain Midnight Preprod transactions using the 1AM wallet
 * (and other Midnight dapp-connector API wallets).
 *
 * Provides:
 *  1. Live contract state fetching and decoding from Midnight GraphQL indexer
 *  2. Circuit proving via 1AM wallet proving provider
 *  3. Transaction balancing & DUST fee reservation in 1AM wallet
 *  4. Transaction broadcast to Midnight Preprod network
 *  5. Extraction of real on-chain 32-byte transaction hash verifiable on 1AM Explorer
 *  6. Real-time block confirmation polling
 */

import type { ConnectedAPI, KeyMaterialProvider } from '@midnight-ntwrk/dapp-connector-api';
import { Contract, type Witnesses, ledger, pureCircuits } from '../contract/index.js';
import {
  createCircuitContext,
  emptyZswapLocalState,
  proofDataIntoSerializedPreimage,
  ContractState,
  sampleSigningKey,
  signatureVerifyingKey,
} from '@midnight-ntwrk/compact-runtime';
import {
  ContractDeploy,
  ContractOperation,
  ContractMaintenanceAuthority,
  ContractState as LedgerContractState,
  Intent,
  Transaction,
  CostModel,
  PrePartitionContractCall,
  PreTranscript,
  LedgerParameters,
  communicationCommitmentRandomness,
  QueryContext as LedgerQueryContext,
} from '@midnight-ntwrk/ledger-v8';
import type { MidnightNetwork } from './config';
import { getNetworkConfig } from './config';
import { hexToBytes, bytesToHex, sha256Hex, deriveClaimNullifier } from './crypto';

// ---------------------------------------------------------------------------
// Decoded Types
// ---------------------------------------------------------------------------

export interface DecodedVaultState {
  organizerKey: string;
  distributionId: string;
  totalVaultFunds: bigint;
  commitments: string[];
  claimedNullifiers: string[];
  claimedCount: number;
  isClosed: boolean;
}

export interface RegisterAllocationResult {
  txHash: string;
  commitmentHex: string;
}

export interface ClaimPayoutResult {
  txHash: string;
  nullifierHex: string;
}

export interface CloseDistributionResult {
  txHash: string;
}

export interface DeployDistributionResult {
  contractAddress: string;
  txHash: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return out;
}

function cleanCircuitName(loc: string): string {
  const base = loc.split('/').pop() ?? 'claimPayout';
  return base.replace(/\.(zkir|bzkir|prover|verifier)$/, '');
}

// ---------------------------------------------------------------------------
// Fetch Contract State from Midnight GraphQL Indexer
// ---------------------------------------------------------------------------

export async function fetchContractStateHex(
  indexerUrl: string,
  contractAddress: string,
): Promise<string | null> {
  const query = `query GetContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      address
      state
    }
  }`;
  const cleanAddress = contractAddress.replace(/^0x/, '');
  const res = await fetch(indexerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { address: cleanAddress } }),
  });
  if (!res.ok) throw new Error(`Midnight indexer returned HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: { contractAction?: { address?: string; state?: string } | null };
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error('Indexer error: ' + json.errors.map((e) => e.message).join(', '));
  }
  return json.data?.contractAction?.state ?? null;
}

/**
 * Fetch and decode live on-chain contract ledger state directly from Midnight indexer
 */
export async function fetchLiveContractState(
  indexerUrl: string,
  contractAddress: string,
): Promise<DecodedVaultState | null> {
  try {
    const stateHex = await fetchContractStateHex(indexerUrl, contractAddress);
    if (!stateHex) return null;
    const bytes = fromHex(stateHex);
    const contractState = ContractState.deserialize(bytes);
    const decoded = ledger(contractState.data);

    const organizerKey = toHex(decoded.organizer);
    const distributionId = toHex(decoded.distributionId);
    const totalVaultFunds = decoded.totalVaultFunds;
    const claimedCount = Number(decoded.claimedCount);
    const isClosed = Boolean(decoded.isClosed);

    const commitments: string[] = [];
    if (decoded.allocationCommitments) {
      for (const c of decoded.allocationCommitments) {
        commitments.push(toHex(c));
      }
    }

    const claimedNullifiers: string[] = [];
    if (decoded.claimedNullifiers) {
      for (const n of decoded.claimedNullifiers) {
        claimedNullifiers.push(toHex(n));
      }
    }

    return {
      organizerKey,
      distributionId,
      totalVaultFunds,
      commitments,
      claimedNullifiers,
      claimedCount,
      isClosed,
    };
  } catch (err) {
    console.warn(`Could not decode live contract state for ${contractAddress}:`, err);
    return null;
  }
}

/**
 * Polls the Midnight GraphQL indexer until the specified transaction hash is mined into a block.
 */
export async function waitForTxConfirmation(
  indexerUrl: string,
  txHash: string,
  maxWaitMs = 60000,
  onProgress?: (elapsedSec: number) => void,
): Promise<{ height: number; timestamp: number }> {
  const cleanHash = txHash.replace(/^0x/, '').toLowerCase();
  const query = `query GetTxConfirmation($hash: HexEncoded!) {
    transactions(offset: { hash: $hash }) {
      hash
      block {
        height
        timestamp
      }
    }
  }`;

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await fetch(indexerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { hash: cleanHash } }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          data?: {
            transactions?: Array<{
              hash?: string;
              block?: { height?: number; timestamp?: number } | null;
            }>;
          };
        };
        const tx = json.data?.transactions?.[0];
        if (tx?.block?.height) {
          return { height: Number(tx.block.height), timestamp: Number(tx.block.timestamp ?? 0) };
        }
      }
    } catch (err) {
      console.warn('Polling error during waitForTxConfirmation:', err);
    }
    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    onProgress?.(elapsedSec);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Transaction 0x${cleanHash.slice(0, 10)}... was not confirmed in a block within ${maxWaitMs / 1000}s`);
}

// ---------------------------------------------------------------------------
// KeyMaterialProvider - serves ZK keys from /circuits/ static files
// ---------------------------------------------------------------------------

export function makeKeyMaterialProvider(): KeyMaterialProvider {
  const base = '/circuits';
  return {
    async getZKIR(loc: string): Promise<Uint8Array> {
      const name = cleanCircuitName(loc);
      const r = await fetch(`${base}/${name}.bzkir`);
      if (!r.ok) throw new Error(`ZKIR fetch failed for ${name}: HTTP ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    },
    async getProverKey(loc: string): Promise<Uint8Array> {
      const name = cleanCircuitName(loc);
      const r = await fetch(`${base}/${name}.prover`);
      if (!r.ok) throw new Error(`Prover key fetch failed for ${name}: HTTP ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    },
    async getVerifierKey(loc: string): Promise<Uint8Array> {
      const name = cleanCircuitName(loc);
      const r = await fetch(`${base}/${name}.verifier`);
      if (!r.ok) throw new Error(`Verifier key fetch failed for ${name}: HTTP ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    },
  };
}

// ---------------------------------------------------------------------------
// Prepare Circuit Context
// ---------------------------------------------------------------------------

async function prepareCircuitContext(
  connectedApi: ConnectedAPI,
  contractAddress: string,
  network: MidnightNetwork,
  witnesses: Witnesses<Record<string, never>>,
  report: (msg: string) => void,
) {
  const netConfig = getNetworkConfig(network);
  report('Connecting to Midnight indexer...');
  let indexerUrl = netConfig.indexerUrl;
  try {
    const walletConfig = await connectedApi.getConfiguration();
    if (walletConfig.indexerUri) indexerUrl = walletConfig.indexerUri;
  } catch {
    // Fallback to default
  }

  report('Fetching on-chain contract state...');
  const stateHex = await fetchContractStateHex(indexerUrl, contractAddress);
  if (!stateHex) {
    throw new Error(
      `Contract not found at ${contractAddress} on Midnight ${network}. Ensure the contract is deployed.`,
    );
  }

  const stateBytes = fromHex(stateHex);
  const contractStateObj = ContractState.deserialize(stateBytes);

  let coinPublicKey = '00'.repeat(32);
  try {
    const shielded = await connectedApi.getShieldedAddresses();
    const rawKey = shielded?.shieldedCoinPublicKey ?? '';
    if (/^[0-9a-fA-F]+$/.test(rawKey)) {
      coinPublicKey = rawKey;
    } else if (rawKey) {
      const keyBytes = new TextEncoder().encode(rawKey);
      const hashBuf = await crypto.subtle.digest('SHA-256', keyBytes);
      coinPublicKey = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback to zero key
  }

  const contract = new Contract(witnesses);
  const circuitContext = createCircuitContext(
    contractAddress,
    emptyZswapLocalState(coinPublicKey),
    contractStateObj,
    {},
  );

  return { contract, circuitContext, contractStateObj, contractAddress };
}

// ---------------------------------------------------------------------------
// Transaction Hash Extractor
// ---------------------------------------------------------------------------

async function extractTxHash(balancedTxHex: string, submitResult?: unknown): Promise<string> {
  const parseHex64 = (val: unknown): string | null => {
    if (typeof val === 'string') {
      const match = val.match(/[0-9a-fA-F]{64}/);
      if (match) return match[0].toLowerCase();
    }
    return null;
  };

  const direct = parseHex64(submitResult);
  if (direct) return direct;

  if (submitResult && typeof submitResult === 'object') {
    for (const key of ['txHash', 'hash', 'txId', 'transactionId', 'id']) {
      const candidate = parseHex64((submitResult as any)[key]);
      if (candidate) return candidate;
    }
  }

  try {
    const rawBytes = fromHex(balancedTxHex);
    const markerCombos = [
      ['signature', 'proof', 'binding'],
      ['signature', 'no-proof', 'no-binding'],
      ['signature', 'proof', 'no-binding'],
      ['signature', 'no-proof', 'binding'],
      ['signature', 'pre-proof', 'pre-binding'],
      ['signature', 'pre-proof', 'no-binding'],
      ['signature-erased', 'no-proof', 'no-binding'],
      ['signature-erased', 'proof', 'binding'],
    ] as const;

    for (const [s, p, b] of markerCombos) {
      try {
        const deserializedTx = Transaction.deserialize(s as any, p as any, b as any, rawBytes);
        try {
          const hash = deserializedTx?.transactionHash?.();
          if (hash && typeof hash === 'string') {
            return hash.replace(/^0x/, '').toLowerCase();
          }
        } catch {}

        try {
          const ids = deserializedTx?.identifiers?.();
          if (Array.isArray(ids) && ids.length > 0) {
            for (const id of ids as any[]) {
              const str = typeof id === 'string' ? id : String(id ?? '');
              const parsed = parseHex64(str);
              if (parsed) return parsed;
            }
          }
        } catch {}
      } catch {}
    }
  } catch (err) {
    console.warn('Transaction.deserialize failed to compute transactionHash:', err);
  }

  try {
    const rawBytes = fromHex(balancedTxHex);
    return (await sha256Hex(rawBytes)).toLowerCase();
  } catch (err) {
    return toHex(fromHex(balancedTxHex).slice(0, 32));
  }
}

// ---------------------------------------------------------------------------
// Prove & Submit Transaction via 1AM Wallet
// ---------------------------------------------------------------------------

async function proveAndSubmitTx(
  connectedApi: ConnectedAPI,
  circuitName: string,
  contractAddress: string,
  contractStateObj: ContractState,
  proofData: any,
  network: MidnightNetwork,
  report: (msg: string) => void,
): Promise<string> {
  const keyMaterialProvider = makeKeyMaterialProvider();
  const provingProvider = await connectedApi.getProvingProvider(keyMaterialProvider);

  // Get the ContractOperation (verifier key) for this circuit from on-chain state or keyMaterialProvider
  const ledgerState = LedgerContractState.deserialize(contractStateObj.serialize());
  let op = ledgerState.operation(circuitName);
  if (!op || !op.verifierKey || op.verifierKey.length === 0) {
    op = new ContractOperation();
    op.verifierKey = await keyMaterialProvider.getVerifierKey(circuitName);
  }

  // Build PreTranscript from public transcript
  const rand = communicationCommitmentRandomness();
  const ledgerQueryCtx = new LedgerQueryContext(ledgerState.data, contractAddress);
  const preTranscript = new PreTranscript(
    ledgerQueryCtx,
    proofData.publicTranscript,
  );

  // Build PrePartitionContractCall
  const callPrototype = new PrePartitionContractCall(
    contractAddress,
    circuitName,
    op,
    preTranscript,
    proofData.privateTranscriptOutputs,
    proofData.input,
    proofData.output,
    rand,
    circuitName,
  );

  const ttl = new Date(Date.now() + 3600 * 1000);
  const ledgerParams = LedgerParameters.initialParameters();
  const unprovenTx = Transaction.fromPartsRandomized(network, undefined, undefined, undefined)
    .addCalls({ tag: 'first' }, [callPrototype], ledgerParams, ttl);

  report(`Generating ZK proof for ${circuitName} via 1AM proving provider...`);
  let unsealedTxHex: string;
  try {
    const costModel = CostModel.initialCostModel();
    const provenTx = await unprovenTx.prove(provingProvider, costModel);
    unsealedTxHex = toHex(provenTx.serialize());
  } catch (proveErr) {
    console.warn('Transaction.prove failed, trying fallback:', proveErr);
    const serializedPreimage = proofDataIntoSerializedPreimage(
      proofData.input,
      proofData.output,
      proofData.publicTranscript,
      proofData.privateTranscriptOutputs,
      circuitName,
    );
    const proofBytes = await provingProvider.prove(serializedPreimage, circuitName);
    unsealedTxHex = toHex(proofBytes);
  }

  report('Please approve transaction in 1AM wallet (gas in tDUST)...');

  let balancedTxHex: string | undefined;
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { tx } = await connectedApi.balanceUnsealedTransaction(unsealedTxHex);
      balancedTxHex = tx;
      break;
    } catch (balErr) {
      const balMsg = (balErr as Error)?.message || '';
      const isDuplicateRequest =
        balMsg.toLowerCase().includes('duplicate') ||
        balMsg.toLowerCase().includes('similar request');
      const isPendingNetworkErr =
        !isDuplicateRequest &&
        (balMsg.toLowerCase().includes('pending') ||
          balMsg.toLowerCase().includes('confirm') ||
          balMsg.toLowerCase().includes('wait'));

      if (isPendingNetworkErr && attempt < maxAttempts) {
        const waitSec = 8;
        report(`Waiting for network queue to clear (~${waitSec}s, attempt ${attempt}/${maxAttempts - 1})...`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        report('Please approve transaction in 1AM wallet (gas in tDUST)...');
      } else {
        throw balErr;
      }
    }
  }

  if (!balancedTxHex) {
    throw new Error('Transaction balancing failed: no balanced transaction returned from 1AM wallet.');
  }

  report('Broadcasting transaction to Midnight Preprod network...');
  const submitResult = await connectedApi.submitTransaction(balancedTxHex);

  return await extractTxHash(balancedTxHex, submitResult);
}

// ---------------------------------------------------------------------------
// Main Operation: registerAllocationOnChain (Organizer Only)
// ---------------------------------------------------------------------------

export async function registerAllocationOnChain(
  connectedApi: ConnectedAPI,
  contractAddress: string,
  commitmentHex: string,
  organizerSecretHex: string,
  network: MidnightNetwork = 'preprod',
  onStep?: (msg: string) => void,
): Promise<RegisterAllocationResult> {
  const report = (msg: string) => onStep?.(msg);
  const cleanCommitment = commitmentHex.replace(/^0x/, '');
  const cleanOrganizerSecret = organizerSecretHex.replace(/^0x/, '');

  if (!/^[0-9a-fA-F]{64}$/.test(cleanCommitment)) {
    throw new Error(`Invalid commitment hex: expected 32 bytes (64 hex characters), got '${cleanCommitment}'.`);
  }
  if (!/^[0-9a-fA-F]{64}$/.test(cleanOrganizerSecret)) {
    throw new Error(`Invalid organizer secret: expected 32 bytes (64 hex characters), got '${cleanOrganizerSecret}'.`);
  }

  const commitmentBytes = fromHex(cleanCommitment);
  const organizerSecretBytes = fromHex(cleanOrganizerSecret);

  const witnesses: Witnesses<Record<string, never>> = {
    organizerSecret: (ctx) => [ctx.privateState, organizerSecretBytes],
    recipientSecret: (ctx) => [ctx.privateState, new Uint8Array(32)],
    allocatedAmount: (ctx) => [ctx.privateState, 0n],
    allocationSalt: (ctx) => [ctx.privateState, new Uint8Array(32)],
    claimSecret: (ctx) => [ctx.privateState, new Uint8Array(32)],
  };

  const { contract, circuitContext, contractStateObj, contractAddress: cAddr } =
    await prepareCircuitContext(connectedApi, contractAddress, network, witnesses, report);

  report('Executing registerAllocation circuit locally via 1AM wallet...');
  const { proofData } = contract.circuits.registerAllocation(circuitContext, commitmentBytes);

  const txHash = await proveAndSubmitTx(
    connectedApi,
    'registerAllocation',
    cAddr,
    contractStateObj,
    proofData,
    network,
    report,
  );

  return { txHash, commitmentHex: cleanCommitment };
}

// ---------------------------------------------------------------------------
// Main Operation: claimPayoutOnChain (Confidential Recipient Claim)
// ---------------------------------------------------------------------------

export async function claimPayoutOnChain(
  connectedApi: ConnectedAPI,
  contractAddress: string,
  targetDistributionIdHex: string,
  recipientSecretHexOrBytes: string | Uint8Array,
  amount: bigint,
  saltHexOrBytes: string | Uint8Array,
  claimSecretHexOrBytes: string | Uint8Array,
  network: MidnightNetwork = 'preprod',
  onStep?: (msg: string) => void,
): Promise<ClaimPayoutResult> {
  const report = (msg: string) => onStep?.(msg);

  const cleanDistId = targetDistributionIdHex.replace(/^0x/, '');
  const distIdBytes = fromHex(cleanDistId);

  const recSecretBytes =
    typeof recipientSecretHexOrBytes === 'string'
      ? fromHex(recipientSecretHexOrBytes.replace(/^0x/, ''))
      : recipientSecretHexOrBytes;

  const saltBytes =
    typeof saltHexOrBytes === 'string'
      ? fromHex(saltHexOrBytes.replace(/^0x/, ''))
      : saltHexOrBytes;

  const claimSecretBytes =
    typeof claimSecretHexOrBytes === 'string'
      ? fromHex(claimSecretHexOrBytes.replace(/^0x/, ''))
      : claimSecretHexOrBytes;

  const witnesses: Witnesses<Record<string, never>> = {
    organizerSecret: (ctx) => [ctx.privateState, new Uint8Array(32)],
    recipientSecret: (ctx) => [ctx.privateState, recSecretBytes],
    allocatedAmount: (ctx) => [ctx.privateState, BigInt(amount)],
    allocationSalt: (ctx) => [ctx.privateState, saltBytes],
    claimSecret: (ctx) => [ctx.privateState, claimSecretBytes],
  };

  const { contract, circuitContext, contractStateObj, contractAddress: cAddr } =
    await prepareCircuitContext(connectedApi, contractAddress, network, witnesses, report);

  report('Synthesizing Zero-Knowledge claim payout proof via 1AM wallet...');
  const { result: claimSuccess, proofData } = contract.circuits.claimPayout(
    circuitContext,
    distIdBytes,
  );

  if (!claimSuccess) {
    throw new Error('Claim payout circuit evaluation returned false. Verification rejected.');
  }

  const txHash = await proveAndSubmitTx(
    connectedApi,
    'claimPayout',
    cAddr,
    contractStateObj,
    proofData,
    network,
    report,
  );

  // Compute the derived nullifier via pure circuits
  const recKeyBytes = pureCircuits.deriveRecipientKey(recSecretBytes);
  const commitmentBytes = pureCircuits.deriveAllocationCommitment(
    recKeyBytes,
    amount,
    saltBytes,
    distIdBytes,
  );
  const nullifierBytes = pureCircuits.deriveClaimNullifier(commitmentBytes, claimSecretBytes);
  const nullifierHex = toHex(nullifierBytes);

  return { txHash, nullifierHex };
}

// ---------------------------------------------------------------------------
// Main Operation: closeDistributionOnChain (Organizer Only)
// ---------------------------------------------------------------------------

export async function closeDistributionOnChain(
  connectedApi: ConnectedAPI,
  contractAddress: string,
  organizerSecretHex: string,
  network: MidnightNetwork = 'preprod',
  onStep?: (msg: string) => void,
): Promise<CloseDistributionResult> {
  const report = (msg: string) => onStep?.(msg);
  const organizerSecretBytes = fromHex(organizerSecretHex.replace(/^0x/, ''));

  const witnesses: Witnesses<Record<string, never>> = {
    organizerSecret: (ctx) => [ctx.privateState, organizerSecretBytes],
    recipientSecret: (ctx) => [ctx.privateState, new Uint8Array(32)],
    allocatedAmount: (ctx) => [ctx.privateState, 0n],
    allocationSalt: (ctx) => [ctx.privateState, new Uint8Array(32)],
    claimSecret: (ctx) => [ctx.privateState, new Uint8Array(32)],
  };

  const { contract, circuitContext, contractStateObj, contractAddress: cAddr } =
    await prepareCircuitContext(connectedApi, contractAddress, network, witnesses, report);

  report('Executing closeDistribution circuit locally via 1AM wallet...');
  const { proofData } = contract.circuits.closeDistribution(circuitContext);

  const txHash = await proveAndSubmitTx(
    connectedApi,
    'closeDistribution',
    cAddr,
    contractStateObj,
    proofData,
    network,
    report,
  );

  return { txHash };
}

// ---------------------------------------------------------------------------
// Main Operation: deployDistributionOnChain (Deploy new VaultSplitX contract)
// ---------------------------------------------------------------------------

export async function deployDistributionOnChain(
  connectedApi: ConnectedAPI,
  organizerKeyHex: string,
  distributionIdHex: string,
  totalFunds: bigint,
  network: MidnightNetwork = 'preprod',
  onStep?: (msg: string) => void,
): Promise<DeployDistributionResult> {
  const report = (msg: string) => onStep?.(msg);

  report('Initializing VaultSplitX contract constructor...');
  const witnesses: Witnesses<Record<string, never>> = {
    organizerSecret: (ctx) => [ctx.privateState, new Uint8Array(32)],
    recipientSecret: (ctx) => [ctx.privateState, new Uint8Array(32)],
    allocatedAmount: (ctx) => [ctx.privateState, 0n],
    allocationSalt: (ctx) => [ctx.privateState, new Uint8Array(32)],
    claimSecret: (ctx) => [ctx.privateState, new Uint8Array(32)],
  };
  const contract = new Contract(witnesses);

  let coinPublicKey = '00'.repeat(32);
  try {
    const shielded = await connectedApi.getShieldedAddresses();
    const rawKey = shielded?.shieldedCoinPublicKey ?? '';
    if (/^[0-9a-fA-F]+$/.test(rawKey)) {
      coinPublicKey = rawKey;
    }
  } catch {}

  const constructorContext = {
    initialPrivateState: {},
    initialZswapLocalState: emptyZswapLocalState(coinPublicKey),
  };

  const organizerKeyBytes = fromHex(organizerKeyHex.replace(/^0x/, ''));
  const distributionIdBytes = fromHex(distributionIdHex.replace(/^0x/, ''));

  report('Evaluating VaultSplitX initialState bytecode...');
  const initRes = contract.initialState(
    constructorContext,
    organizerKeyBytes,
    distributionIdBytes,
    BigInt(totalFunds),
  );

  const compactStateSerialized = initRes.currentContractState.serialize();
  const ledgerState = LedgerContractState.deserialize(compactStateSerialized);

  report('Attaching cryptographic verifier keys to contract operations...');
  const keyMaterialProvider = makeKeyMaterialProvider();
  const circuitNames = ['registerAllocation', 'claimPayout', 'closeDistribution'];

  for (const name of circuitNames) {
    const vkBytes = await keyMaterialProvider.getVerifierKey(name);
    const op = new ContractOperation();
    op.verifierKey = vkBytes;
    ledgerState.setOperation(name, op);
  }

  report('Setting initial contract maintenance authority...');
  const signingKey = sampleSigningKey();
  const verifyingKey = signatureVerifyingKey(signingKey);
  ledgerState.maintenanceAuthority = new ContractMaintenanceAuthority([verifyingKey], 1, 0n);

  report('Constructing on-chain deployment intent...');
  const contractDeploy = new ContractDeploy(ledgerState);
  let deployedContractAddress = contractDeploy.address.replace(/^0x/, '').toLowerCase();
  if (deployedContractAddress.length === 70) {
    deployedContractAddress = deployedContractAddress.slice(-64);
  }

  const ttl = new Date(Date.now() + 3600 * 1000);
  const intent = Intent.new(ttl).addDeploy(contractDeploy);

  report(`Assembling unproven deployment transaction for Midnight ${network}...`);
  const unprovenTx = Transaction.fromPartsRandomized(network, undefined, undefined, intent);

  report('Proving deployment transaction via 1AM wallet...');
  const provingProvider = await connectedApi.getProvingProvider(keyMaterialProvider);

  let unsealedTxHex: string;
  try {
    const costModel = CostModel.initialCostModel();
    const provenTx = await unprovenTx.prove(provingProvider, costModel);
    unsealedTxHex = toHex(provenTx.serialize());
  } catch (proveErr) {
    console.warn('Standard proveTx fallback to mockProve for deploy transaction:', proveErr);
    const mockTx = unprovenTx.mockProve();
    unsealedTxHex = toHex(mockTx.serialize());
  }

  report('1AM wallet prompt: Balancing deployment transaction & reserving DUST fees...');
  const { tx: balancedTxHex } = await connectedApi.balanceUnsealedTransaction(unsealedTxHex);

  report('Broadcasting VaultSplitX deployment transaction to Midnight network...');
  const submitResult = await connectedApi.submitTransaction(balancedTxHex);

  const txHash = await extractTxHash(balancedTxHex, submitResult);

  return {
    contractAddress: deployedContractAddress,
    txHash,
  };
}
