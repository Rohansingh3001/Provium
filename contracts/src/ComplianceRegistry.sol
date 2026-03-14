// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IUltraVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

contract ComplianceRegistry is Ownable {
    struct ComplianceReport {
        uint256 reportId;
        uint8 proofType;
        uint8 trigger;
        uint256 blockNumber;
        bytes32 proofHash;
        bool isCompliant;
        uint256 totalCollateral;
        uint256 totalDebt;
        uint256 ratioBps;
        string jurisdiction;
        string agentReasoning;
        uint256 timestamp;
        address agentAddress;
        uint256 requestId;
    }

    ComplianceReport[] public reports;
    address public agentAddress;
    IUltraVerifier public ultraVerifier;

    // Must match LendingProtocol.wethPriceInUSDC — update via setWethPrice() together.
    uint256 public wethPriceInUSDC = 2000 * 1e6;

    event ReportSubmitted(
        uint256 indexed reportId,
        uint8 proofType,
        bool isCompliant,
        string agentReasoning,
        uint256 ratioBps
    );

    event ViolationRecorded(
        uint256 indexed reportId,
        uint8 proofType,
        uint256 blockNumber,
        uint256 ratioBps
    );

    modifier onlyAgent() {
        require(msg.sender == agentAddress, "Only agent");
        _;
    }

    constructor(address _verifier) Ownable(msg.sender) {
        if (_verifier != address(0)) ultraVerifier = IUltraVerifier(_verifier);
    }

    function submitReport(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        uint8 proofType,
        uint8 trigger,
        uint256 blockNumber,
        bool isCompliant,
        uint256 totalCollateral,
        uint256 totalDebt,
        string calldata jurisdiction,
        string calldata agentReasoning,
        uint256 requestId
    ) external onlyAgent returns (uint256) {
        // If claiming compliance, the ZK proof MUST verify on-chain — cannot be faked
        if (isCompliant && address(ultraVerifier) != address(0)) {
            require(ultraVerifier.verify(proof, publicInputs), "ZK proof verification failed");
        }
        bytes32 proofHash = keccak256(proof);
        uint256 ratioBps = totalDebt == 0
            ? type(uint256).max
            : (totalCollateral * wethPriceInUSDC * 10000) / (totalDebt * 1e18);
        uint256 id = reports.length;

        reports.push(ComplianceReport({
            reportId: id,
            proofType: proofType,
            trigger: trigger,
            blockNumber: blockNumber,
            proofHash: proofHash,
            isCompliant: isCompliant,
            totalCollateral: totalCollateral,
            totalDebt: totalDebt,
            ratioBps: ratioBps,
            jurisdiction: jurisdiction,
            agentReasoning: agentReasoning,
            timestamp: block.timestamp,
            agentAddress: msg.sender,
            requestId: requestId
        }));

        emit ReportSubmitted(id, proofType, isCompliant, agentReasoning, ratioBps);

        if (!isCompliant) {
            emit ViolationRecorded(id, proofType, blockNumber, ratioBps);
        }

        return id;
    }

    function getReport(uint256 id) external view returns (ComplianceReport memory) {
        require(id < reports.length, "Report not found");
        return reports[id];
    }

    // WARNING: unbounded — may revert at scale. Prefer getReports() with pagination.
    function getAllReports() external view returns (ComplianceReport[] memory) {
        return reports;
    }

    // Paginated reports: pass offset=0, limit=getReportCount() to get all.
    function getReports(uint256 offset, uint256 limit)
        external view returns (ComplianceReport[] memory page)
    {
        uint256 end = offset + limit;
        if (end > reports.length) end = reports.length;
        require(offset <= end, "Invalid range");
        page = new ComplianceReport[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = reports[i];
        }
    }

    function getLatestReport() external view returns (ComplianceReport memory) {
        require(reports.length > 0, "No reports");
        return reports[reports.length - 1];
    }

    function isCurrentlyCompliant() external view returns (bool) {
        if (reports.length == 0) return true;
        return reports[reports.length - 1].isCompliant;
    }

    function getReportCount() external view returns (uint256) {
        return reports.length;
    }

    // Verifier cannot be set to address(0) — use a dedicated governance process to replace it.
    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Zero address: use a valid verifier");
        ultraVerifier = IUltraVerifier(_verifier);
    }

    // Keep wethPriceInUSDC in sync with LendingProtocol.
    function setWethPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be > 0");
        wethPriceInUSDC = newPrice;
    }

    function setAgentAddress(address agent) external onlyOwner {
        require(agent != address(0), "Zero address");
        agentAddress = agent;
    }
}
