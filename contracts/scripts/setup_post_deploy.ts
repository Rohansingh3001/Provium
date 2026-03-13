import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    const cfg = JSON.parse(fs.readFileSync("./deployments/base-sepolia.json", "utf8"));
    const [deployer] = await ethers.getSigners();
    const agent = cfg.agentWallet;
    console.log("Post-deploy setup. Agent:", agent);

    const lending  = await ethers.getContractAt("LendingProtocol", cfg.LendingProtocol);
    const portal   = await ethers.getContractAt("RegulatorPortal", cfg.RegulatorPortal);
    const registry = await ethers.getContractAt("ComplianceRegistry", cfg.ComplianceRegistry);
    const weth     = await ethers.getContractAt("MockWETH", cfg.MockWETH);
    const usdc     = await ethers.getContractAt("MockUSDC", cfg.MockUSDC);

    console.log("Setting agent on LendingProtocol...");
    await (await lending.setAgentAddress(agent)).wait();
    console.log("Setting agent on RegulatorPortal...");
    await (await portal.setAgentAddress(agent)).wait();
    console.log("Setting agent on ComplianceRegistry...");
    await (await registry.setAgentAddress(agent)).wait();

    console.log("Minting WETH to LendingProtocol...");
    await (await weth.mintTo(cfg.LendingProtocol, ethers.parseEther("1000"))).wait();
    console.log("Minting USDC to LendingProtocol...");
    await (await usdc.mintTo(cfg.LendingProtocol, ethers.parseUnits("1000000", 6))).wait();

    console.log("✓ Post-deploy setup complete!");
}

main().catch(console.error);
