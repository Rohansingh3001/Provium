import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    // Load deployments
    const deploymentsPath = path.join(__dirname, "../deployments/base-sepolia.json");
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error(`Deployments file not found: ${deploymentsPath}. Run deploy.ts first.`);
    }
    const data = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

    // Use deployer or generate deterministic wallets for seeding
    const [deployer] = await ethers.getSigners();

    // Generate deterministic wallets from deployer's private key (for consistent seeding)
    const wallets = [];
    for (let i = 0; i < 5; i++) {
        const wallet = new ethers.Wallet(ethers.id(`provium_seed_batch_3_wallet_${i}`)).connect(ethers.provider as any);
        wallets.push(wallet);
    }
    const weth = await ethers.getContractAt("MockWETH", data.MockWETH) as any;
    const usdc = await ethers.getContractAt("MockUSDC", data.MockUSDC) as any;
    const lending = await ethers.getContractAt("LendingProtocol", data.LendingProtocol) as any;

    // Fund wallets from deployer
    console.log("Funding seed wallets...");
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const tx = await deployer.sendTransaction({
            to: wallet.address,
            value: ethers.parseEther("0.0005"), // Base Sepolia gas is ~0.001 Gwei; 0.0005 ETH covers many txns
        });
        await tx.wait();
        console.log(`Funded wallet ${i + 1}: ${wallet.address}`);
    }

    const amounts = [
        { w: "5", u: "5000" },   // ~163% HF (5 ETH * 2000 / 5000 USDC * 10000)
        { w: "4", u: "4500" },   // ~178% HF
        { w: "3", u: "3500" },   // ~171% HF
        { w: "6", u: "7000" },   // ~171% HF
        { w: "2", u: "2000" }    // ~200% HF
    ];

    console.log("\nCreating positions...");
    for (let i = 0; i < 5; i++) {
        const signer = wallets[i];
        try {
            // Faucet tokens
            let nonce = await signer.getNonce('latest');
            await (await weth.connect(signer).faucet({ nonce: nonce++ })).wait();
            await (await usdc.connect(signer).faucet({ nonce: nonce++ })).wait();

            // Approve and deposit collateral
            await (await weth.connect(signer).approve(lending.target, ethers.MaxUint256, { nonce: nonce++ })).wait();
            await (await lending.connect(signer).deposit(ethers.parseEther(amounts[i].w), { nonce: nonce++ })).wait();

            // Borrow debt
            await (await lending.connect(signer).borrow(ethers.parseUnits(amounts[i].u, 6), { nonce: nonce++ })).wait();

            const hf = await lending.getHealthFactor(signer.address);
            const hfPct = Number(hf) / 100;
            console.log(`  Wallet ${i + 1} (${signer.address.slice(0, 10)}...): HF = ${hfPct.toFixed(1)}%`);
        } catch (error: any) {
            console.error(`  Failed to seed wallet ${i + 1}: ${error.message}`);
        }
    }

    const count = await lending.getUserCount();
    console.log(`Users seeded: ${count}. ✓ Protocol seeded. Ready for agent.`);
}
main().catch(console.error);
