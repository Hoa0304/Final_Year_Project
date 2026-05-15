# Hướng dẫn chi tiết: TaskRewardSystem

Phiên bản: 1.0 — Mô tả chi tiết về hợp đồng `TaskRewardSystem`, cách sử dụng, bảo mật và cách tích hợp với backend.

**Mục lục**
- Giới thiệu
- Mục đích
- Giải thích chi tiết mã nguồn
- Luồng tương tác (call flow)
- Vấn đề bảo mật & rủi ro
- Gợi ý cải tiến (kèm ví dụ mã)
- Triển khai & kiểm thử (Hardhat)
- Tích hợp backend (Ethers.js) — ví dụ
- Kiểm tra & audit
- FAQ ngắn

**Giới thiệu**

Hợp đồng `TaskRewardSystem` lưu vết các nhiệm vụ (task) đã được claim reward để ngăn chặn việc claim đôi. Hợp đồng chỉ ghi nhận rằng một task đã được claim và phát một event `TaskRewardClaimed`.

**Mục đích**

- Cung cấp nguồn đáng tin cậy để audit: backend có thể dựa vào event/record trên blockchain để xác nhận rằng reward đã được cấp.
- Ngăn chặn double-claim: key duy nhất là `keccak256(abi.encodePacked(taskId, user))`.

**Giải thích chi tiết mã nguồn**

- `struct TaskCompletion`:
  - `bytes32 taskId` — hash của task UUID lưu trong database (không lưu plaintext UUID). 
  - `address user` — địa chỉ ví tiền nhận reward.
  - `uint256 rewardAmount` — số token được ghi nhận (chỉ là dữ liệu, hợp đồng không tự transfer token).
  - `uint256 timestamp` — thời điểm ghi nhận trên chuỗi.
  - `bool claimed` — cờ đánh dấu đã claim.

- `mapping(bytes32 => TaskCompletion) taskCompletions` — lưu mỗi completion theo `completionKey`.
- `mapping(address => bytes32[]) userCompletedTasks` — danh sách các taskId (hash) từng user.
- Event `TaskRewardClaimed` phát khi claim.

- Hàm `claimTaskReward(taskId, user, rewardAmount)`:
  1. Tạo `completionKey = keccak256(abi.encodePacked(taskId, user))`.
  2. Kiểm tra `require(!taskCompletions[completionKey].claimed)` để chặn claim trùng.
  3. Ghi struct với `claimed = true` và push `taskId` vào `userCompletedTasks`.
  4. Emit event và trả `true`.

- Hàm view: `isTaskRewardClaimed`, `getTaskCompletion`, `getUserCompletedTasks`.

**Luồng tương tác (gợi ý triển khai thực tế)**

1. Người dùng hoàn thành task trên front-end.
2. Frontend gọi backend API (có auth) báo đã hoàn thành task.
3. Backend kiểm tra logic, xác nhận task chưa claim trong DB, và:
   - Phương án A (recommended): Backend ký một message (EIP-712) chứa `taskId`, `user`, `rewardAmount`, `deadline` và trả signature cho frontend; frontend gửi transaction có signature tới hợp đồng, hợp đồng verify chữ ký và ghi nhận claim. (Giảm quyền privileged và cho phép user tự gửi tx nếu muốn.)
   - Phương án B: Backend trực tiếp gọi `claimTaskReward` bằng private key sở hữu quyền (chỉ khi hợp đồng giới hạn caller bằng `onlyOwner`/`onlyAuthorized`).
4. Hợp đồng lưu record và phát event `TaskRewardClaimed`.
5. Backend/daemon (listener) lắng nghe event để cập nhật DB (đánh dấu đã claim, ghi log, gửi thông báo, phát token nếu cần).

**Vấn đề bảo mật & rủi ro**

- Hợp đồng hiện **không có access control**: bất kỳ address nào cũng có thể gọi `claimTaskReward` nếu biết `taskId, user` — điều này là rủi ro nếu backend không kiểm soát gọi.
- Hợp đồng **không chuyển token**: `rewardAmount` chỉ là metadata. Nếu muốn hợp đồng phân phối token tự động, cần gọi ERC20 `transfer`/`mint` trong hợp đồng.
- Replay / giả mạo: nếu không có bằng chứng chữ ký (signature), attacker có thể giả mạo request. Cần cơ chế xác thực ra chuỗi.

**Gợi ý cải tiến (code snippets)**

- Thêm `Ownable` (OpenZeppelin) để chỉ owner/backend gọi:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";

contract TaskRewardSystem is Ownable {
    // existing code...
    function claimTaskReward(...) external onlyOwner returns (bool) {
        // only owner (backend) can call
    }
}
```

- Hoặc dùng signature verification (EIP-712) để backend ký dữ liệu và user hoặc relay gửi tx:

```solidity
// Pseudocode outline
function claimWithSignature(bytes32 taskId, address user, uint256 rewardAmount, uint256 deadline, bytes calldata signature) external {
  require(block.timestamp <= deadline, "expired");
  bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(...)));
  address signer = ECDSA.recover(digest, signature);
  require(isAuthorizedSigner[signer], "invalid signer");
  // continue to record claim
}
```

- Nếu hợp đồng cần phân phối token, tích hợp `IERC20`:

```solidity
IERC20 public token;
function claimAndPay(...) external onlyAuthorized {
  // record
  token.transfer(user, rewardAmount);
}
```

**Triển khai & kiểm thử (Hardhat)**

1. Cài dependencies (nếu chưa): `cd blockchain && npm install`.
2. Biên dịch:

```bash
cd blockchain
npm run compile
```

3. Chạy node local:

```bash
npm run node
```

4. Deploy (script của repo có `deploy:local`):

```bash
npm run deploy:local
```

5. Kiểm thử unit trong Hardhat (nếu có tests):

```bash
npm test
```

**Tích hợp backend (Ethers.js) — ví dụ lắng nghe event & gọi claim**

- Lắng nghe event:

```js
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const contract = new ethers.Contract(addr, abi, provider);
contract.on('TaskRewardClaimed', (taskId, user, rewardAmount, timestamp) => {
  // cập nhật DB (Supabase) — đánh dấu task đã claim
});
```

- Gọi `claimTaskReward` (backend relay as owner):

```js
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contractWithSigner = contract.connect(wallet);
await contractWithSigner.claimTaskReward(taskIdHash, userAddress, rewardAmount);
```

- Hoặc: backend trả signature cho frontend (EIP-712), frontend gửi tx với `claimWithSignature`.

**Kiểm tra & audit**

- Unit tests: viết test kiểm tra 2 lần gọi với cùng `taskId,user` -> thứ hai revert.
- Integration: hoàn thành flow end-to-end: backend tạo task, backend ký/mint/trigger, gọi contract, listener cập nhật DB.
- Audit checklist:
  - Có access control không? (`Ownable` / `AccessControl`)
  - Có verify source of truth (DB) trước khi emit claim?
  - Có chống replay (deadline, nonce)?
  - Nếu transfer token, có kiểm tra số dư đủ và xử lý lỗi transfer.

**FAQ ngắn**

- Q: Hợp đồng có chuyển token không? A: Hiện tại không; `rewardAmount` là metadata.
- Q: Ai nên gọi `claimTaskReward`? A: Với code hiện tại — bất kỳ ai; KHÔNG an toàn. Nên giới hạn bằng `onlyOwner` hoặc signature.

---

Nếu bạn muốn, tôi có thể:
- (A) Tạo một PR vá hợp đồng (thêm `Ownable` hoặc EIP-712 verify) và test.
- (B) Viết ví dụ unit test (Hardhat + ethers) cho flow claim.
- (C) Viết ví dụ backend (Node.js) để tạo signature và relay transaction.

Cho tôi biết bạn muốn tiếp theo gì — tôi sẽ thực hiện bước tiếp theo.
