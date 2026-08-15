// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KilnAttestation} from "../src/KilnAttestation.sol";
import {KilnEnvelope} from "../src/KilnEnvelope.sol";

contract DeployKiln {
    function run() external returns (KilnAttestation attestation, KilnEnvelope envelope) {
        attestation = new KilnAttestation();
        envelope = new KilnEnvelope();
    }
}
