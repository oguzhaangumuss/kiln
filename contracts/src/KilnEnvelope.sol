// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Spend cap + expiry + revoke. Agent cannot exceed this session.
contract KilnEnvelope {
    struct Session {
        address hirer;
        uint256 agentId;
        uint256 maxUsdt;
        uint256 expiry;
        bool revoked;
        uint256 spent;
    }

    uint256 public nextId = 1;
    mapping(uint256 id => Session) public sessions;

    event Opened(
        uint256 indexed id,
        address indexed hirer,
        uint256 agentId,
        uint256 maxUsdt,
        uint256 expiry
    );
    event Revoked(uint256 indexed id);

    function open(uint256 agentId, uint256 maxUsdt, uint256 hoursAlive)
        external
        payable
        returns (uint256 id)
    {
        require(maxUsdt > 0 && hoursAlive > 0, "empty envelope");
        id = nextId;
        nextId = id + 1;
        uint256 expiry = block.timestamp + hoursAlive * 1 hours;
        sessions[id] = Session({
            hirer: msg.sender,
            agentId: agentId,
            maxUsdt: maxUsdt,
            expiry: expiry,
            revoked: false,
            spent: 0
        });
        emit Opened(id, msg.sender, agentId, maxUsdt, expiry);
    }

    function revoke(uint256 id) external {
        Session storage session = sessions[id];
        require(session.hirer == msg.sender, "not hirer");
        require(!session.revoked, "already revoked");
        session.revoked = true;
        emit Revoked(id);
    }

    function isActive(uint256 id) external view returns (bool) {
        Session memory session = sessions[id];
        return session.hirer != address(0) && !session.revoked && block.timestamp < session.expiry;
    }
}
