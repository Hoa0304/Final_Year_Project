// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TaskRewardSystem
 * @dev Smart contract to manage task rewards and prevent double-claiming
 * This ensures task rewards are distributed fairly and transparently
 */
contract TaskRewardSystem {
    // Task completion structure
    struct TaskCompletion {
        bytes32 taskId; // Hash of task UUID from database
        address user;
        uint256 rewardAmount;
        uint256 timestamp;
        bool claimed;
    }

    // Mapping from task completion hash to TaskCompletion
    mapping(bytes32 => TaskCompletion) public taskCompletions;

    // Mapping from user to array of completed task IDs
    mapping(address => bytes32[]) public userCompletedTasks;

    // Event emitted when a task reward is claimed
    event TaskRewardClaimed(
        bytes32 indexed taskId,
        address indexed user,
        uint256 rewardAmount,
        uint256 timestamp
    );

    /**
     * @dev Claim reward for completing a task
     * @param taskId Hash of task UUID from database
     * @param user User address who completed the task
     * @param rewardAmount Reward amount in tokens
     * @return success True if reward was successfully claimed
     */
    function claimTaskReward(
        bytes32 taskId,
        address user,
        uint256 rewardAmount
    ) external returns (bool) {
        // Create unique key for this task completion
        bytes32 completionKey = keccak256(abi.encodePacked(taskId, user));

        // Check if already claimed
        require(!taskCompletions[completionKey].claimed, "TaskRewardSystem: reward already claimed");

        // Record task completion
        TaskCompletion memory completion = TaskCompletion({
            taskId: taskId,
            user: user,
            rewardAmount: rewardAmount,
            timestamp: block.timestamp,
            claimed: true
        });

        taskCompletions[completionKey] = completion;
        userCompletedTasks[user].push(taskId);

        emit TaskRewardClaimed(taskId, user, rewardAmount, block.timestamp);

        return true;
    }

    /**
     * @dev Check if a task reward has been claimed
     * @param taskId Hash of task UUID
     * @param user User address
     * @return claimed True if reward was already claimed
     */
    function isTaskRewardClaimed(bytes32 taskId, address user) external view returns (bool) {
        bytes32 completionKey = keccak256(abi.encodePacked(taskId, user));
        return taskCompletions[completionKey].claimed;
    }

    /**
     * @dev Get task completion details
     * @param taskId Hash of task UUID
     * @param user User address
     * @return TaskCompletion struct
     */
    function getTaskCompletion(bytes32 taskId, address user) external view returns (TaskCompletion memory) {
        bytes32 completionKey = keccak256(abi.encodePacked(taskId, user));
        require(taskCompletions[completionKey].claimed, "TaskRewardSystem: task not completed");
        return taskCompletions[completionKey];
    }

    /**
     * @dev Get all completed task IDs for a user
     * @param user User address
     * @return Array of task IDs (hashed)
     */
    function getUserCompletedTasks(address user) external view returns (bytes32[] memory) {
        return userCompletedTasks[user];
    }
}





