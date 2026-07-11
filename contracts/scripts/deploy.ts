import { ethers, run } from "hardhat";
import * as fs from "fs";

async function main() {
    console.log("Starting deployments...");
    const [deployer] = await ethers.getSigners();

    const MockWETH = await ethers.getContractFactory("MockWETH");
    const weth = await MockWETH.deploy();
    await weth.waitForDeployment();
    console.log("MockWETH deployed to:", weth.target);

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    console.log("MockUSDC deployed to:", usdc.target);

    const LendingProtocol = await ethers.getContractFactory("LendingProtocol");
    const lending = await LendingProtocol.deploy(weth.target, usdc.target);
    await lending.waitForDeployment();
    console.log("LendingProtocol deployed to:", lending.target);

    const RegulatorPortal = await ethers.getContractFactory("RegulatorPortal");
    const portal = await RegulatorPortal.deploy(lending.target);
    await portal.waitForDeployment();
    console.log("RegulatorPortal deployed to:", portal.target);

    // Deploy the verifier BEFORE the registry so we can wire it in the constructor.
    const UltraVerifier = await ethers.getContractFactory("UltraVerifier");
    const verifier = await UltraVerifier.deploy();
    await verifier.waitForDeployment();
    console.log("UltraVerifier deployed to:", verifier.target);

    // Registry now takes (verifier, lendingProtocol): the lending address lets it
    // bind every verified proof's positions_root/protocol_address to live chain state.
    const ComplianceRegistry = await ethers.getContractFactory("ComplianceRegistry");
    const registry = await ComplianceRegistry.deploy(verifier.target, lending.target);
    await registry.waitForDeployment();
    console.log("ComplianceRegistry deployed to:", registry.target);

    const agentWallet = process.env.AGENT_WALLET_ADDRESS || deployer.address;
    await lending.setAgentAddress(agentWallet);
    await portal.setAgentAddress(agentWallet);
    await registry.setAgentAddress(agentWallet);

    // Wire ZK verifier + lending into compliance contracts — proof verification and
    // public-input binding are now enforced on-chain.
    await registry.setVerifier(verifier.target);
    await portal.setVerifier(verifier.target);
    await portal.setLendingProtocol(lending.target);
    console.log("ZK verifier + lending wired into ComplianceRegistry and RegulatorPortal");

    await weth.mintTo(lending.target, ethers.parseEther("1000"));
    await usdc.mintTo(lending.target, ethers.parseUnits("1000000", 6));

    const blockNum = await ethers.provider.getBlockNumber();

    fs.mkdirSync("./deployments", { recursive: true });
    fs.writeFileSync("./deployments/base-sepolia.json", JSON.stringify({
        network: "base-sepolia",
        chainId: 84532,
        deployedAt: blockNum,
        MockWETH: weth.target,
        MockUSDC: usdc.target,
        LendingProtocol: lending.target,
        RegulatorPortal: portal.target,
        ComplianceRegistry: registry.target,
        UltraVerifier: verifier.target,
        agentWallet: agentWallet
    }, null, 2));

    console.log("✓ Deployment saved. Ready for agent.");
}

main().catch(console.error);
