// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IUltraVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

contract RegulatorPortal is Ownable {
    struct ComplianceRequest {
        uint256 requestId;
        address requestor;
        uint8 proofType;
        uint256 targetBlock;
        string jurisdiction;
        uint256 requestedAt;
        uint256 deadline;
        bool fulfilled;
        uint256 fulfilledAt;
        bytes32 proofHash;
        string agentReasoning;
    }

    // Use mapping to avoid large struct-array copies (prevents stack-too-deep)
    mapping(uint256 => ComplianceRequest) private _requests;
    uint256 public requestCount;

    address public agentAddress;
    address public lendingProtocol;
    IUltraVerifier public ultraVerifier;

    event ComplianceRequested(uint256 indexed requestId, address requestor, uint8 proofType, string jurisdiction, uint256 targetBlock);
    event RequestFulfilled(uint256 indexed requestId, bytes32 proofHash, string agentReasoning, uint256 timestamp);

    modifier onlyAgent() {
        require(msg.sender == agentAddress, "Only agent");
        _;
    }

    constructor(address _lendingProtocol) Ownable(msg.sender) {
        lendingProtocol = _lendingProtocol;
    }

    function requestComplianceProof(
        uint8 proofType,
        uint256 targetBlock,
        string calldata jurisdiction
    ) external returns (uint256) {
        uint256 id = requestCount++;
        _storeRequest(id, proofType, targetBlock, jurisdiction);
        emit ComplianceRequested(id, msg.sender, proofType, jurisdiction, targetBlock);
        return id;
    }

    function _storeRequest(
        uint256 id,
        uint8 proofType,
        uint256 targetBlock,
        string calldata jurisdiction
    ) internal {
        ComplianceRequest storage r = _requests[id];
        r.requestId    = id;
        r.requestor    = msg.sender;
        r.proofType    = proofType;
        r.targetBlock  = targetBlock;
        r.jurisdiction = jurisdiction;
        r.requestedAt  = block.timestamp;
        r.deadline     = block.timestamp + 600;
    }

    function fulfillRequest(
        uint256 requestId,
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        string calldata agentReasoning
    ) external onlyAgent {
        // ZK proof must verify on-chain before fulfilling regulator request
        if (address(ultraVerifier) != address(0)) {
            require(ultraVerifier.verify(proof, publicInputs), "ZK proof verification failed");
        }
        bytes32 ph = keccak256(proof);
        _fulfill(requestId, ph, agentReasoning);
    }

    function _fulfill(
        uint256 requestId,
        bytes32 ph,
        string calldata agentReasoning
    ) internal {
        ComplianceRequest storage r = _requests[requestId];
        require(!r.fulfilled, "Already fulfilled");
        require(block.timestamp <= r.deadline, "Expired");
        r.fulfilled      = true;
        r.fulfilledAt    = block.timestamp;
        r.proofHash      = ph;
        r.agentReasoning = agentReasoning;
        emit RequestFulfilled(requestId, ph, agentReasoning, block.timestamp);
    }

    function getPendingRequests() external view returns (ComplianceRequest[] memory) {
        uint256 total = requestCount;
        uint256 count = _countPending(total);
        ComplianceRequest[] memory pending = new ComplianceRequest[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < total; i++) {
            if (_isPending(i)) {
                pending[idx++] = _requests[i];
            }
        }
        return pending;
    }

    function _isPending(uint256 id) internal view returns (bool) {
        return !_requests[id].fulfilled && block.timestamp <= _requests[id].deadline;
    }

    function _countPending(uint256 total) internal view returns (uint256 count) {
        for (uint256 i = 0; i < total; i++) {
            if (_isPending(i)) count++;
        }
    }

    function getRequest(uint256 id) external view returns (ComplianceRequest memory) {
        return _requests[id];
    }

    // Backward-compat getter mirroring a public array getter
    function requests(uint256 id) external view returns (
        uint256, address, uint8, uint256, string memory,
        uint256, uint256, bool, uint256, bytes32, string memory
    ) {
        ComplianceRequest storage r = _requests[id];
        return (r.requestId, r.requestor, r.proofType, r.targetBlock,
                r.jurisdiction, r.requestedAt, r.deadline, r.fulfilled,
                r.fulfilledAt, r.proofHash, r.agentReasoning);
    }

    function setVerifier(address _verifier) external onlyOwner {
        ultraVerifier = IUltraVerifier(_verifier);
    }

    function setAgentAddress(address agent) external onlyOwner {
        agentAddress = agent;
    }
}
