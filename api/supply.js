const { Connection, PublicKey } = require('@solana/web3.js');

module.exports = async (req, res) => {
  // Pull settings from Environment Variables
  const MINT_ADDR = process.env.MINT_ADDRESS;
  const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
  
  // Split the comma-separated string from .env into an array and clean whitespace
  const EXCLUDED_WALLETS = (process.env.EXCLUDED_WALLETS || "").split(',').map(addr => addr.trim());

  // Set Headers for CoinGecko
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain');

  if (!MINT_ADDR) {
    return res.status(500).send("Error: MINT_ADDRESS not configured.");
  }

  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const mintPublicKey = new PublicKey(MINT_ADDR);

    // 1. Fetch the on-chain Total Supply
    const supplyRes = await connection.getTokenSupply(mintPublicKey);
    let circulatingSupply = supplyRes.value.uiAmount;

    // 2. Subtract balances of all excluded wallets
    for (const walletAddr of EXCLUDED_WALLETS) {
      if (!walletAddr) continue;
      try {
        const owner = new PublicKey(walletAddr);
        const tokenAccounts = await connection.getTokenAccountsByOwner(owner, {
          mint: mintPublicKey,
        });

        for (const account of tokenAccounts.value) {
          const balanceRes = await connection.getTokenAccountBalance(account.pubkey);
          circulatingSupply -= (balanceRes.value.uiAmount || 0);
        }
      } catch (err) {
        console.error(`Skipping wallet ${walletAddr}`);
      }
    }

    // 3. Return as a clean number string
    return res.status(200).send(circulatingSupply.toString());

  } catch (error) {
    return res.status(500).send("Error calculating supply");
  }
};
