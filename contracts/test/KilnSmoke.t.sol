// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KilnAttestation} from "../src/KilnAttestation.sol";
import {KilnEnvelope} from "../src/KilnEnvelope.sol";

contract KilnSmoke {
    function test_attestThenCap() public {
        KilnAttestation kiln = new KilnAttestation();
        KilnEnvelope envelope = new KilnEnvelope();
        kiln.attest(101, keccak256("sample"));
        uint256 id = envelope.open(101, 50, 6);
        require(envelope.isActive(id), "should be live");
        envelope.revoke(id);
        require(!envelope.isActive(id), "revoked");
    }
}
