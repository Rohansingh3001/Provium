/**
 * Compile Circuit and Generate Verifier
 * 
 * This script:
 * 1. Compiles the Noir circuit
 * 2. Generates the UltraVerifier contract
 * 3. Copies it to contracts/src/UltraVerifier.sol
 * 
 * Run: npx ts-node scripts/compile-circuit.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const CIRCUITS_DIR = path.join(__dirname, "../../circuits/collateral_proof");
const VERIFIER_SOURCE = path.join(CIRCUITS_DIR, "target/contract/UltraVerifier.sol");
const VERIFIER_DEST = path.join(__dirname, "../src/UltraVerifier.sol");

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Provium — Circuit Compilation");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Check nargo
    try {
        const nargoVersion = execSync("nargo --version", { encoding: "utf-8" }).trim();
        console.log(`✓ nargo found: ${nargoVersion}\n`);
    } catch (error) {
        console.error("✗ nargo not found!");
        console.error("  Install: curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash");
        console.error("  Then: noirup");
        process.exit(1);
    }

    // Step 1: Compile
    console.log("Step 1/3: Compiling Noir circuit...");
    try {
        execSync("nargo compile", {
            cwd: CIRCUITS_DIR,
            stdio: "inherit",
        });
        console.log("✓ Circuit compiled\n");
    } catch (error) {
        console.error("✗ Compilation failed!");
        process.exit(1);
    }

    // Step 2: Generate verifier
    console.log("Step 2/3: Generating UltraVerifier contract...");
    try {
        execSync("nargo codegen-verifier", {
            cwd: CIRCUITS_DIR,
            stdio: "inherit",
        });
        console.log("✓ Verifier generated\n");
    } catch (error) {
        console.error("✗ Verifier generation failed!");
        process.exit(1);
    }

    // Step 3: Copy to contracts/src
    console.log("Step 3/3: Copying verifier to contracts/src/...");
    if (!fs.existsSync(VERIFIER_SOURCE)) {
        console.error(`✗ Verifier not found at: ${VERIFIER_SOURCE}`);
        console.error("  Check that nargo codegen-verifier completed successfully.");
        process.exit(1);
    }

    const verifierContent = fs.readFileSync(VERIFIER_SOURCE, "utf-8");
    fs.writeFileSync(VERIFIER_DEST, verifierContent);
    console.log(`✓ Copied to ${VERIFIER_DEST}\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✓ Circuit ready! Next steps:");
    console.log("  1. npx hardhat compile");
    console.log("  2. npx hardhat run scripts/deploy.ts --network baseSepolia");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch(console.error);
