const { Connection, PublicKey } = require('@solana/web3.js');

const MINT_ADDRESS = new PublicKey("6QhZ6WQyYjLGDXFuc9CP1MzzvfeA6rDVnPYUke6ybuff");
const EXCLUDED_WALLETS = [
  "4wkdNpaQuiyfMmq6J94egidAN9sWwzGRfWk45KZt4uZN",
  "9ZNSQ3TBsXPHUMvTEpobPG2ZDoKY7nq9k3SBGPVSfb6M",
  "6TBMvAbc7MnyRP7Li4VL6L8rd8CUbRWNwoKTsqnzz1Jv",
  "1nc1nerator11111111111111111111111111111111"
];
const RPC_URL = "https://api.mainnet-beta.solana.com";

module.exports = async (req, res) => {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');

    // 2. Get Total Supply
    const supplyInfo = await connection.getTokenSupply(MINT_ADDRESS);
    const totalAmount = supplyInfo.value.uiAmount;

    // 3. Get Balances of Excluded Wallets
    let excludedTotal = 0;

    for (const wallet of EXCLUDED_WALLETS) {
      const owner = new PublicKey(wallet);
      
      // Find the specific token account for this mint held by this wallet
      const tokenAccounts = await connection.getTokenAccountsByOwner(owner, {
        mint: MINT_ADDRESS,
      });

      for (const account of tokenAccounts.value) {
        const balanceInfo = await connection.getTokenAccountBalance(account.pubkey);
        excludedTotal += balanceInfo.value.uiAmount;
      }
    }

    // 4. Calculate Circulating Supply
    const circulatingSupply = totalAmount - excludedTotal;

    // 5. Response (CoinGecko prefers plain text for supply)
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(circulatingSupply.toString());

  } catch (error) {
    console.error(error);
    return res.status(500).send("Error calculating supply");
  }
};
