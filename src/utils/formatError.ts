/**
 * Utility to format raw errors and exceptions into user-friendly, human-readable messages.
 * Logs the raw error to console.error as required.
 */

export function formatHumanReadableError(error: unknown, contextTitle?: string): string {
  // Always log raw error to console as required
  console.error('[VaultSplitX Action Error]:', error);

  if (!error) {
    return contextTitle
      ? `${contextTitle} failed. Please try again.`
      : 'An unexpected error occurred. Please try again.';
  }

  // Extract raw string message
  let rawMsg = '';
  if (typeof error === 'string') {
    rawMsg = error;
  } else if (error instanceof Error) {
    rawMsg = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    rawMsg =
      (typeof errObj.message === 'string' && errObj.message) ||
      (typeof errObj.reason === 'string' && errObj.reason) ||
      (typeof errObj.details === 'string' && errObj.details) ||
      (typeof errObj.error === 'string' && errObj.error) ||
      JSON.stringify(error);
  }

  const lower = rawMsg.toLowerCase();

  // 1. Double claim / already claimed nullifier (check first before generic reject)
  if (
    lower.includes('double-claim') ||
    lower.includes('already been claimed') ||
    lower.includes('nullifier exists')
  ) {
    return 'Double-claim rejected: This allocation has already been claimed on the Midnight ledger.';
  }

  // 2. ZK Proof / Commitment verification failure
  if (
    lower.includes('no matching allocation') ||
    lower.includes('zk verification failed') ||
    lower.includes('commitment not found')
  ) {
    return 'Zero-Knowledge verification failed: No matching allocation commitment was found on-chain. Please verify your secret passphrase, payout amount, or blinding salt.';
  }

  // 3. User rejection / wallet cancel
  if (
    lower.includes('reject') ||
    lower.includes('declined') ||
    lower.includes('denied') ||
    lower.includes('cancel') ||
    lower.includes('user rejected')
  ) {
    return 'Transaction or connection request was cancelled in your wallet.';
  }

  // 4. Midnight Lace extension detection
  if (
    lower.includes('lace') &&
    (lower.includes('not detected') || lower.includes('not found') || lower.includes('install'))
  ) {
    return 'Midnight Lace wallet is not detected. Please install Midnight Lace and switch to the Preprod network.';
  }

  if (
    lower.includes('1am wallet connection is required') ||
    lower.includes('wallet connection was not completed')
  ) {
    return 'Midnight Lace wallet connection is required to approve transactions on Midnight Preprod.';
  }

  // 5. Distribution closed
  if (lower.includes('closed distribution') || lower.includes('distribution is closed')) {
    return 'This distribution batch is closed. No new claims or allocations can be accepted.';
  }

  // 6. Balanced amount / Zero amount
  if (
    lower.includes('must equal the total vault funds') ||
    lower.includes('allocation is not balanced')
  ) {
    return 'The total allocated amount must equal the total vault deposit.';
  }

  if (
    lower.includes('must be greater than zero') ||
    lower.includes('amount must be greater than zero')
  ) {
    return 'Allocation amount must be greater than zero.';
  }

  // 7. Network / connection / indexer issues
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('econnrefused') ||
    lower.includes('indexer') ||
    lower.includes('fetch failed')
  ) {
    return 'Network connection error: Unable to reach the Midnight Preprod indexer or RPC node. Please check your internet connection.';
  }

  // 8. Prover / Proof server issues
  if (
    lower.includes('proof-server') ||
    lower.includes('proof generation failed') ||
    lower.includes('synthesis')
  ) {
    return 'Zero-Knowledge proof synthesis failed. Please ensure your proof provider is available and try again.';
  }

  // 9. Insufficient funds / balance
  if (lower.includes('insufficient') || lower.includes('balance') || lower.includes('dust')) {
    return 'Insufficient tDUST balance in your wallet to cover transaction fees.';
  }

  // 10. Already in progress
  if (lower.includes('already in progress')) {
    return 'A zero-knowledge proof or transaction is already in progress. Please wait for it to finish.';
  }

  // 11. Voucher formatting
  if (
    lower.includes('unexpected token') ||
    lower.includes('missing required voucher fields') ||
    lower.includes('invalid voucher') ||
    lower.includes('invalid json')
  ) {
    return 'Invalid voucher format. Please ensure you provide a valid JSON voucher containing recipient secret, amount, and salt.';
  }

  // 12. Clean up technical prefixes like "Error: ", "Uncaught (in promise) Error: "
  const cleaned = rawMsg
    .replace(/^uncaught \(in promise\)\s*/i, '')
    .replace(/^error:\s*/i, '')
    .trim();

  // If reasonably short and readable without stack traces, return cleaned string
  if (
    cleaned.length > 0 &&
    cleaned.length < 180 &&
    !cleaned.includes('\n') &&
    !cleaned.includes('    at ')
  ) {
    return cleaned;
  }

  return contextTitle
    ? `${contextTitle} failed. Please check inputs and try again.`
    : 'Action failed due to an on-chain or network issue. Please try again.';
}
