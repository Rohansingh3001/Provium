// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IUltraVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

interface ILendingProtocol {
    function currentPositionRoot() external view returns (bytes32);
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

    // The LendingProtocol whose committed position root every proof must match.
    ILendingProtocol public lendingProtocol;

    // The collateral ratio (bps) a compliant proof must attest to. Must equal
    // the circuit's min_ratio_bps public input AND LendingProtocol.MIN_RATIO_BPS.
    uint256 public requiredRatioBps = 15000; // 150%

    // Number of public inputs the collateral circuit exposes, in this order:
    // [0]=positions_root [1]=min_ratio_bps [2]=total_collateral
    // [3]=total_debt [4]=block_number [5]=protocol_address
    uint256 private constant PUBLIC_INPUT_COUNT = 6;

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

    constructor(address _verifier, address _lendingProtocol) Ownable(msg.sender) {
        if (_verifier != address(0)) ultraVerifier = IUltraVerifier(_verifier);
        if (_lendingProtocol != address(0)) lendingProtocol = ILendingProtocol(_lendingProtocol);
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
        // If claiming compliance, the ZK proof MUST verify on-chain — cannot be faked.
        // Verification alone is not enough: the proof commits to a set of PUBLIC INPUTS,
        // and we must bind those inputs to the values stored in this report. Otherwise a
        // valid proof about numbers X could be paired with a report claiming numbers Y.
        if (isCompliant && address(ultraVerifier) != address(0)) {
            require(ultraVerifier.verify(proof, publicInputs), "ZK proof verification failed");
            _bindPublicInputs(publicInputs, blockNumber, totalCollateral, totalDebt);
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

    // Ties a verified proof to the report's claimed values. Reverts if the proof's
    // public inputs disagree with what the agent is asking us to store — this is what
    // makes "trust the math" real rather than decorative.
    function _bindPublicInputs(
        bytes32[] calldata publicInputs,
        uint256 blockNumber,
        uint256 totalCollateral,
        uint256 totalDebt
    ) internal view {
        require(publicInputs.length == PUBLIC_INPUT_COUNT, "Bad public input count");

        // [0] positions_root — must match the root LendingProtocol has committed on-chain,
        // so the proof is about the protocol's ACTUAL current positions, not a stale/forged set.
        if (address(lendingProtocol) != address(0)) {
            require(publicInputs[0] == lendingProtocol.currentPositionRoot(), "Root mismatch");
        }
        // [1] min_ratio_bps — the threshold the circuit enforced must be the required one.
        require(uint256(publicInputs[1]) == requiredRatioBps, "Ratio threshold mismatch");
        // [2] total_collateral / [3] total_debt — the proven aggregates must equal what we store.
        require(uint256(publicInputs[2]) == totalCollateral, "Collateral mismatch");
        require(uint256(publicInputs[3]) == totalDebt, "Debt mismatch");
        // [4] block_number — the proven block must equal the report's block.
        require(uint256(publicInputs[4]) == blockNumber, "Block mismatch");
        // [5] protocol_address — the proof must be about THIS protocol.
        if (address(lendingProtocol) != address(0)) {
            require(uint256(publicInputs[5]) == uint256(uint160(address(lendingProtocol))), "Protocol mismatch");
        }
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

    // The LendingProtocol whose committed root proofs are bound to.
    function setLendingProtocol(address _lendingProtocol) external onlyOwner {
        require(_lendingProtocol != address(0), "Zero address");
        lendingProtocol = ILendingProtocol(_lendingProtocol);
    }

    // Keep in sync with LendingProtocol.MIN_RATIO_BPS and the circuit's min_ratio_bps.
    function setRequiredRatioBps(uint256 bps) external onlyOwner {
        require(bps > 0, "Ratio must be > 0");
        requiredRatioBps = bps;
    }
}
