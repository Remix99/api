const { Connection, PublicKey } = require('@solana/web3.js');

module.exports = async (req, res) => {
  // 1. Pull settings from Environment Variables
  const MINT_ADDR = process.env.MINT_ADDRESS;
  const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
  
  // Split the comma-separated string from .env into an array
  const EXCLUDED_WALLETS = (process.env.EXCLUDED_WALLETS || "").split(',').map(addr => addr.trim());

  // Set Headers for CoinGecko
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain');

  if (!MINT_ADDR) {
    return res.status(500).send("Error: MINT_ADDRESS not configured in Vercel/env.");
  }

  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const mintPublicKey = new PublicKey(MINT_ADDR);

    // 2. Fetch the on-chain Total Supply
    const supplyRes = await connection.getTokenSupply(mintPublicKey);
    let circulatingSupply = supplyRes.value.uiAmount;

    // 3. Subtract balances of all excluded wallets (including Incinerator)
    for (const walletAddr of EXCLUDED_WALLETS) {
      if (!walletAddr) continue;

      try {
        const owner = new PublicKey(walletAddr);
        
        // Find all token accounts for your mint owned by this wallet
        const tokenAccounts = await connection.getTokenAccountsByOwner(owner, {
          mint: mintPublicKey,
        });

        for (const account of tokenAccounts.value) {
          const balanceRes = await connection.getTokenAccountBalance(account.pubkey);
          const amount = balanceRes.value.uiAmount || 0;
          circulatingSupply -= amount;
        }
      } catch (err) {
        console.error(`Skipping wallet ${walletAddr}: Account might not exist yet.`);
      }
    }

    // 4. Return the clean number
    return res.status(200).send(circulatingSupply.toString());

  } catch (error) {
    console.error("Global Error:", error);
    return res.status(500).send("Error calculating supply");
  }
};
