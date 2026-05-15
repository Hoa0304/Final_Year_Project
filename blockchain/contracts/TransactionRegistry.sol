// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TransactionRegistry
 * @dev Registry to record all virtual currency transactions on-chain
 * This provides immutable audit trail for all transactions
 */
contract TransactionRegistry {
    // Transaction structure
    struct Transaction {
        uint256 id;
        address user;
        string transactionType; // "earn", "spend", "grant", "revoke", "task_reward", "stock_profit", "stock_loss"
        uint256 amount;
        uint256 balanceBefore;
        uint256 balanceAfter;
        string description;
        bytes32 referenceId; // Hash of reference UUID from database
        string referenceType; // "order", "task", "stock", "admin_grant", etc.
        address createdBy; // Admin address if applicable
        uint256 timestamp;
        bool exists;
    }

    // Mapping from transaction ID to Transaction
    mapping(uint256 => Transaction) public transactions;

    // Mapping from user address to array of transaction IDs
    mapping(address => uint256[]) public userTransactions;

    // Total transaction count
    uint256 public transactionCount;

    // Event emitted when a new transaction is registered
    event TransactionRegistered(
        uint256 indexed id,
        address indexed user,
        string transactionType,
        uint256 amount,
        uint256 balanceBefore,
        uint256 balanceAfter,
        string description,
        bytes32 referenceId,
        string referenceType,
        address createdBy,
        uint256 timestamp
    );

    /**
     * @dev Register a new transaction
     * @param user User address
     * @param transactionType Type of transaction
     * @param amount Transaction amount
     * @param balanceBefore Balance before transaction
     * @param balanceAfter Balance after transaction
     * @param description Transaction description
     * @param referenceId Hash of reference ID from database
     * @param referenceType Type of reference
     * @param createdBy Address of admin if applicable
     */
    function registerTransaction(
        address user,
        string memory transactionType,
        uint256 amount,
        uint256 balanceBefore,
        uint256 balanceAfter,
        string memory description,
        bytes32 referenceId,
        string memory referenceType,
        address createdBy
    ) external returns (uint256) {
        transactionCount++;
        uint256 txId = transactionCount;

        Transaction memory newTx = Transaction({
            id: txId,
            user: user,
            transactionType: transactionType,
            amount: amount,
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
            description: description,
            referenceId: referenceId,
            referenceType: referenceType,
            createdBy: createdBy,
            timestamp: block.timestamp,
            exists: true
        });

        transactions[txId] = newTx;
        userTransactions[user].push(txId);

        emit TransactionRegistered(
            txId,
            user,
            transactionType,
            amount,
            balanceBefore,
            balanceAfter,
            description,
            referenceId,
            referenceType,
            createdBy,
            block.timestamp
        );

        return txId;
    }

    /**
     * @dev Get transaction by ID
     * @param txId Transaction ID
     * @return Transaction struct
     */
    function getTransaction(uint256 txId) external view returns (Transaction memory) {
        require(transactions[txId].exists, "TransactionRegistry: transaction does not exist");
        return transactions[txId];
    }

    /**
     * @dev Get all transaction IDs for a user
     * @param user User address
     * @return Array of transaction IDs
     */
    function getUserTransactionIds(address user) external view returns (uint256[] memory) {
        return userTransactions[user];
    }

    /**
     * @dev Get transaction count for a user
     * @param user User address
     * @return Number of transactions
     */
    function getUserTransactionCount(address user) external view returns (uint256) {
        return userTransactions[user].length;
    }

    /**
     * @dev Get total transaction count
     * @return Total number of transactions
     */
    function getTotalTransactionCount() external view returns (uint256) {
        return transactionCount;
    }
}





