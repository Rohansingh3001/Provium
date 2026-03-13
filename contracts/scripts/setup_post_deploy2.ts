import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    const [deployer] = await ethers.getSigners();
    const cfg = JSON.parse(fs.readFileSync("./deployments/base-sepolia.json", "utf8"));

    const agentWallet  = cfg.agentWallet;
    const verifierAddr = cfg.UltraVerifier;

    const lending  = await ethers.getContractAt("LendingProtocol",    cfg.LendingProtocol);
    const portal   = await ethers.getContractAt("RegulatorPortal",    cfg.RegulatorPortal);
    const registry = await ethers.getContractAt("ComplianceRegistry", cfg.ComplianceRegistry);
    const weth     = await ethers.getContractAt("MockWETH",           cfg.MockWETH);
    const usdc     = await ethers.getContractAt("MockUSDC",           cfg.MockUSDC);

    console.log("Setting agent addresses...");
    await (await lending.setAgentAddress(agentWallet)).wait();
    console.log("  LendingProtocol.setAgentAddress ✓");
    await (await portal.setAgentAddress(agentWallet)).wait();
    console.log("  RegulatorPortal.setAgentAddress ✓");
    await (await registry.setAgentAddress(agentWallet)).wait();
    console.log("  ComplianceRegistry.setAgentAddress ✓");

    console.log("Wiring ZK verifier...");
    await (await portal.setVerifier(verifierAddr)).wait();
    console.log("  RegulatorPortal.setVerifier ✓");
    await (await registry.setVerifier(verifierAddr)).wait();
    console.log("  ComplianceRegistry.setVerifier ✓");

    console.log("Minting liquidity...");
    await (await weth.mintTo(cfg.LendingProtocol, ethers.parseEther("1000"))).wait();
    console.log("  WETH minted ✓");
    await (await usdc.mintTo(cfg.LendingProtocol, ethers.parseUnits("1000000", 6))).wait();
    console.log("  USDC minted ✓");

    console.log("\n✅ Post-deploy setup complete.");
    console.log("  Agent:", agentWallet);
    console.log("  Verifier wired into ComplianceRegistry and RegulatorPortal");
}

main().catch(console.error);
