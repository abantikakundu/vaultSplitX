import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  organizerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  recipientSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  allocatedAmount(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  allocationSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  claimSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  registerAllocation(context: __compactRuntime.CircuitContext<PS>,
                     commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  claimPayout(context: __compactRuntime.CircuitContext<PS>,
              targetDistributionId_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  closeDistribution(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerAllocation(context: __compactRuntime.CircuitContext<PS>,
                     commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  claimPayout(context: __compactRuntime.CircuitContext<PS>,
              targetDistributionId_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  closeDistribution(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  deriveOrganizerKey(secret_0: Uint8Array): Uint8Array;
  deriveRecipientKey(secret_0: Uint8Array): Uint8Array;
  deriveAllocationCommitment(recipientId_0: Uint8Array,
                             amount_0: bigint,
                             salt_0: Uint8Array,
                             distId_0: Uint8Array): Uint8Array;
  deriveClaimNullifier(commitment_0: Uint8Array, secret_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  deriveOrganizerKey(context: __compactRuntime.CircuitContext<PS>,
                     secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deriveRecipientKey(context: __compactRuntime.CircuitContext<PS>,
                     secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deriveAllocationCommitment(context: __compactRuntime.CircuitContext<PS>,
                             recipientId_0: Uint8Array,
                             amount_0: bigint,
                             salt_0: Uint8Array,
                             distId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deriveClaimNullifier(context: __compactRuntime.CircuitContext<PS>,
                       commitment_0: Uint8Array,
                       secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  registerAllocation(context: __compactRuntime.CircuitContext<PS>,
                     commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  claimPayout(context: __compactRuntime.CircuitContext<PS>,
              targetDistributionId_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  closeDistribution(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly organizer: Uint8Array;
  readonly distributionId: Uint8Array;
  readonly totalVaultFunds: bigint;
  allocationCommitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  claimedNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly claimedCount: bigint;
  readonly isClosed: boolean;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               initialOrganizerKey_0: Uint8Array,
               initialDistributionId_0: Uint8Array,
               totalFunds_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
