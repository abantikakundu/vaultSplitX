import deployment from '../../deployment.json';

export const NETWORK_CONFIG = {
  network: deployment.network || 'preprod',
  contractAddress: deployment.contractAddress || 'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e',
  deployedAt: deployment.deployedAt,
  explorerUrl: `https://explorer.1am.xyz/contract/${deployment.contractAddress}?network=preprod`,
  faucetUrl: 'https://faucet.preprod.midnight.network',
  docsUrl: 'https://github.com/abantikakundu/vaultSplitX#readme',
  githubUrl: 'https://github.com/abantikakundu/vaultSplitX',
};
