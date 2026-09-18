// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../ModelChain.sol";

// Local test fixture for malicious/rejecting payout recipients.
contract RevenueRecipient {
    ModelChain public immutable marketplace;
    bool public rejectPayment;
    bool public attemptReentry;
    bool public reentrySucceeded;
    constructor(ModelChain target) { marketplace = target; }
    function register() external { marketplace.registerModel("Fixture", "encrypted-fixture", "hash", 100, 95); }
    function configure(bool reject, bool reenter) external { rejectPayment = reject; attemptReentry = reenter; }
    function withdraw() external { marketplace.withdrawRevenue(); }
    receive() external payable {
        require(!rejectPayment, "Recipient rejects ETH");
        if (attemptReentry) {
            (reentrySucceeded,) = address(marketplace).call(abi.encodeCall(ModelChain.withdrawRevenue, ()));
        }
    }
}
