export type MidnightNetwork = 'preprod' | 'preview';

export interface NetworkConfig {
  id: MidnightNetwork;
  name: string;
  badgeLabel: string;
  contractAddress: string;
  deployedAt: string;
  status: 'deployed' | 'configured';
  indexerUrl: string;
  indexerWS: string;
  nodeUrl: string;
  nodeWS: string;
  faucetUrl: string;
  explorerBaseUrl: string;
  explorerContractUrl: string;
  activeCircuits: string[];
  defaultOrganizer: {
    organizerKey: string;
    distributionId: string;
    organizerSecretHex: string;
    totalFunds: bigint;
  };
}

export const NETWORKS: Record<MidnightNetwork, NetworkConfig> = {
  preprod: {
    id: 'preprod',
    name: 'Midnight Preprod',
    badgeLabel: 'Preprod Testnet',
    contractAddress:
      import.meta.env.VITE_MIDNIGHT_CONTRACT_ADDRESS ||
      'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e',
    deployedAt: '2026-09-19T06:31:40.027Z',
    status: 'deployed',
    indexerUrl: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    nodeUrl: 'https://rpc.preprod.midnight.network',
    nodeWS: 'wss://rpc.preprod.midnight.network',
    faucetUrl: 'https://midnight-tmnight-preprod.nethermind.dev/',
    explorerBaseUrl: 'https://explorer.1am.xyz',
    explorerContractUrl:
      'https://explorer.1am.xyz/contract/ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e?network=preprod',
    activeCircuits: ['registerAllocation', 'claimPayout', 'closeDistribution'],
    defaultOrganizer: {
      organizerKey: 'ec09fba5287d79904b8fc6e9c697beca57ec057ee4d41e8988da557833d5fc13',
      distributionId: 'a22378798d24fc24cf961b51ffe2d4046f7581e5e1434a8e6fc0519df4fd374a',
      organizerSecretHex: '5f385ef3036da0b0295922a23a1ee9c5ba6c902a33c407d193237742284fd062',
      totalFunds: 100_000n,
    },
  },
  preview: {
    id: 'preview',
    name: 'Midnight Preview',
    badgeLabel: 'Preview Testnet',
    contractAddress: '',
    deployedAt: '',
    status: 'configured',
    indexerUrl: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    nodeUrl: 'https://rpc.preview.midnight.network',
    nodeWS: 'wss://rpc.preview.midnight.network',
    faucetUrl: 'https://midnight-tmnight-preview.nethermind.dev/',
    explorerBaseUrl: 'https://explorer.1am.xyz',
    explorerContractUrl: 'https://explorer.1am.xyz?network=preview',
    activeCircuits: ['registerAllocation', 'claimPayout', 'closeDistribution'],
    defaultOrganizer: {
      organizerKey: '',
      distributionId: '',
      organizerSecretHex: '',
      totalFunds: 100_000n,
    },
  },
};

export function getNetworkConfig(network: MidnightNetwork = 'preprod'): NetworkConfig {
  return NETWORKS[network] ?? NETWORKS.preprod;
}

export function getExplorerContractUrl(
  contractAddress: string,
  network: MidnightNetwork = 'preprod',
): string {
  const clean = contractAddress.replace(/^0x/, '');
  return `https://explorer.1am.xyz/contract/${clean}?network=${network}`;
}

export function getExplorerTxUrl(
  txHash: string,
  network: MidnightNetwork = 'preprod',
): string {
  const clean = txHash.replace(/^0x/, '');
  return `https://explorer.1am.xyz/tx/${clean}?network=${network}`;
}

export function shortenAddress(address?: string | null): string {
  if (!address || address.length < 16) return address || '';
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

export function shortenTxHash(txHash?: string | null): string {
  if (!txHash) return '';
  const clean = txHash.replace(/^0x/, '');
  if (clean.length <= 16) return clean;
  return `0x${clean.slice(0, 8)}...${clean.slice(-6)}`;
}
