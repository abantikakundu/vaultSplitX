import deployment from '../../deployment.json';
import { getExplorerContractUrl, getExplorerTxUrl, getNetworkConfig, NETWORKS } from '../midnight/config';

export const NETWORK_CONFIG = {
  network: (deployment.network || 'preprod') as 'preprod' | 'preview',
  contractAddress: deployment.contractAddress || 'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e',
  deployedAt: deployment.deployedAt,
  explorerUrl: getExplorerContractUrl(
    deployment.contractAddress || 'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e',
    (deployment.network as 'preprod' | 'preview') || 'preprod',
  ),
  faucetUrl: 'https://midnight-tmnight-preprod.nethermind.dev/',
  docsUrl: 'https://github.com/abantikakundu/vaultSplitX#readme',
  githubUrl: 'https://github.com/abantikakundu/vaultSplitX',
};

export { getExplorerContractUrl, getExplorerTxUrl, getNetworkConfig, NETWORKS };
