// Seeds wallets 0 and 1 using mintTo (bypasses 24h faucet cooldown)
import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    const [deployer] = await ethers.getSigners();
    const cfg = JSON.parse(fs.readFileSync("./deployments/base-sepolia.json", "utf8"));

    const wallets = [0, 1].map(i =>
        new ethers.Wallet(ethers.id(`provium_seed_batch_3_wallet_${i}`)).connect(ethers.provider as any)
    );

    const weth    = await ethers.getContractAt("MockWETH",         cfg.MockWETH);
    const usdc    = await ethers.getContractAt("MockUSDC",         cfg.MockUSDC);
    const lending = await ethers.getContractAt("LendingProtocol",  cfg.LendingProtocol);

    // Amounts for wallets 0 and 1 (match original seed.ts)
    const amounts = [
        { w: "5", u: "5000" },  // wallet 0: ~163% HF
        { w: "4", u: "4500" },  // wallet 1: ~178% HF
    ];

    for (let i = 0; i < 2; i++) {
        const signer = wallets[i];
        console.log(`Seeding wallet ${i}: ${signer.address}`);

        // Mint directly as deployer (bypasses faucet cooldown)
        await (await weth.mintTo(signer.address, ethers.parseEther(amounts[i].w))).wait();
        await (await usdc.mintTo(signer.address, ethers.parseUnits(amounts[i].u, 6))).wait();
        console.log(`  Minted ${amounts[i].w} WETH + ${amounts[i].u} USDC`);

        // Approve + deposit collateral
        let nonce = await signer.getNonce("latest");
        await (await (weth as any).connect(signer).approve(cfg.LendingProtocol, ethers.MaxUint256, { nonce: nonce++ })).wait();
        await (await (lending as any).connect(signer).deposit(ethers.parseEther(amounts[i].w), { nonce: nonce++ })).wait();
        await (await (lending as any).connect(signer).borrow(ethers.parseUnits(amounts[i].u, 6), { nonce: nonce++ })).wait();

        const hf = await (lending as any).getHealthFactor(signer.address);
        console.log(`  HF = ${(Number(hf) / 100).toFixed(1)}% ✓`);
    }

    const count = await (lending as any).getUserCount();
    console.log(`\nTotal users: ${count} ✅`);
}

main().catch(console.error);
