import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

export {
  Contract,
  ledger,
  pureCircuits,
} from '../managed/vaultSplitX/contract/index.js';
import { Contract } from '../managed/vaultSplitX/contract/index.js';

const contractDirectory = path.dirname(fileURLToPath(import.meta.url));
export const zkConfigPath = path.resolve(contractDirectory, '..', 'managed', 'vaultSplitX');

export const createCompiledVaultSplitXContract = (witnesses) => CompiledContract.make(
  'VaultSplitXContract',
  Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);
