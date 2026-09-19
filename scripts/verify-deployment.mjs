import * as compactRuntime from '@midnight-ntwrk/compact-runtime';

const address = 'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e';
const query = `query GetContractState($address: HexEncoded!) {
  contractAction(address: $address) {
    address
    state
  }
}`;

function fromHex(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return out;
}

async function main() {
  console.log(`Querying Midnight Preprod indexer for contract: ${address}...`);
  const res = await fetch('https://indexer.preprod.midnight.network/api/v4/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { address } }),
  });
  const json = await res.json();
  console.log('Indexer response:', JSON.stringify(json, null, 2));

  if (json.data?.contractAction?.state) {
    const stateHex = json.data.contractAction.state;
    const bytes = fromHex(stateHex);
    const contractState = compactRuntime.ContractState.deserialize(bytes);
    console.log('\nDeserialized Contract State:');
    console.log('Data:', contractState.data.state.toString());
  }
}

main().catch(console.error);
