// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Sample-run result hash for an ERC-8004 agentId. Registration is not trust.
contract KilnAttestation {
    struct Record {
        bytes32 resultHash;
        address attester;
        uint256 at;
    }

    mapping(uint256 agentId => Record) public latest;

    event Attested(uint256 indexed agentId, bytes32 resultHash, address indexed attester);

    function attest(uint256 agentId, bytes32 resultHash) external {
        require(resultHash != bytes32(0), "empty hash");
        latest[agentId] = Record({
            resultHash: resultHash,
            attester: msg.sender,
            at: block.timestamp
        });
        emit Attested(agentId, resultHash, msg.sender);
    }
}
