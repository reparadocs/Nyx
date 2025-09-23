/**
 * Helius DAS API Utility for Token Balances
 * Uses getAssetsByOwner endpoint to retrieve comprehensive wallet balances
 * Documentation: https://www.helius.dev/docs/api-reference/das/getassetsbyowner
 */
import InjectMagicAPI from "./api.js";

class HeliusBalances {
  constructor() {
    this.baseUrl = "https://mainnet.helius-rpc.com";
  }

  get apiKey() {
    return process.env.HELIUS_API_KEY;
  }

  /**
   * Get all assets owned by a wallet address
   * @param {string} ownerAddress - The wallet address to query
   * @param {object} options - Query options
   * @returns {Promise<object>} The response data
   */
  async getAssetsByOwner(ownerAddress, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error("HELIUS_API_KEY is required but not provided");
      }

      const defaultOptions = {
        page: 1,
        limit: 1000,
        sortBy: {
          sortBy: "created",
          sortDirection: "desc",
        },
        options: {
          showUnverifiedCollections: false,
          showCollectionMetadata: true,
          showGrandTotal: true,
          showFungible: true,
          showNativeBalance: true,
          showInscription: true,
          showZeroBalance: false,
          ...options.options,
        },
        ...options,
      };

      const requestBody = {
        jsonrpc: "2.0",
        id: "1",
        method: "getAssetsByOwner",
        params: {
          ownerAddress,
          ...defaultOptions,
        },
      };

      const url = `${this.baseUrl}/?api-key=${this.apiKey}`;

      console.log(`Fetching assets for owner: ${ownerAddress}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(
          `Helius API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log(data);

      if (data.error) {
        throw new Error(`Helius API error: ${data.error.message}`);
      }

      return {
        success: true,
        data: data.result,
        ownerAddress,
      };
    } catch (error) {
      console.error(`Helius Balances Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        ownerAddress,
      };
    }
  }

  /**
   * Get simplified token balances (fungible tokens only)
   * @param {string} ownerAddress - The wallet address to query
   * @returns {Promise<object>} Simplified balance data
   */
  async getTokenBalances(ownerAddress, whitelistToken = null) {
    try {
      const result = await this.getAssetsByOwner(ownerAddress, {
        options: {
          showFungible: true,
          showNativeBalance: true,
          showUnverifiedCollections: false,
          showCollectionMetadata: false,
          showGrandTotal: false,
          showInscription: false,
          showZeroBalance: false,
        },
      });

      if (!result.success) {
        return result;
      }

      const _whitelistedTokens = await InjectMagicAPI.getWhitelistedTokens();
      const whitelistedTokens = whitelistToken
        ? [whitelistToken, ..._whitelistedTokens]
        : _whitelistedTokens;

      const { items, nativeBalance } = result.data;

      // Process fungible tokens
      const tokenBalances = items
        .filter((item) => item.interface === "FungibleToken")
        .filter((item) => whitelistedTokens.includes(item.id))
        .map((item) => {
          const decimals = item.token_info?.decimals || 0;
          const rawBalance = item.token_info?.balance || "0";

          // Format balance with proper decimals
          const formattedBalance = (
            parseFloat(rawBalance) / Math.pow(10, decimals)
          ).toFixed(decimals);

          return {
            mint: item.id,
            symbol: item.content?.metadata?.symbol || "",
            name: item.content?.metadata?.name || "",
            balance: formattedBalance,
          };
        });

      // Add native SOL if available
      const solBalance = nativeBalance?.lamports || 0;
      const solBalanceFormatted = (solBalance / 1e9).toFixed(9);

      return {
        success: true,
        ownerAddress,
        solanaBalance: solBalanceFormatted,
        tokenBalances,
      };
    } catch (error) {
      console.error(`Token Balances Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        ownerAddress,
      };
    }
  }

  async getTokenBalance(ownerAddress, _token) {
    const result = await this.getTokenBalances(ownerAddress, _token);
    const _ret = result.tokenBalances.find((token) => token.mint === _token);
    return _ret ? _ret.balance : "0";
  }
}

// Create and export a singleton instance
const heliusBalances = new HeliusBalances();

export default heliusBalances;
