/* eslint-disable no-console */
/* eslint-disable max-len */
import dotenv from "dotenv";
dotenv.config();
import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
  InputViewFunctionData,
  Network,
  NetworkToNetworkName,
  sleep,
} from "@aptos-labs/ts-sdk";
import chalk from "chalk";

import { compilePackage, getPackageBytesToPublish } from "./utils";

const APTOS_NETWORK: Network =
  NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.DEVNET];
const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

/** Admin adds addresses to the allowlist */
async function addToAllowList(
  admin: Account,
  addresses: AccountAddress[],
  claimStart: number = 0,
  claimEnd: number = 0
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: admin.accountAddress,
    data: {
      function: `${admin.accountAddress}::cabalcoin::add_to_allowlist`,
      functionArguments: [
        addresses.map((addr) => addr.toStringLong()),
        claimStart,
        claimEnd,
      ],
    },
  });

  const senderAuthenticator = aptos.transaction.sign({
    signer: admin,
    transaction,
  });
  const pendingTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator,
  });

  return pendingTxn.hash;
}

/* User claims coins if they're on the allowlist */
async function claimCoins(
  moduleAddress: Account,
  claimant: Account
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: claimant.accountAddress,
    data: {
      function: `${moduleAddress.accountAddress.toString()}::cabalcoin::claim`,
      functionArguments: [],
    },
  });
  const senderAuthenticator = aptos.transaction.sign({
    signer: claimant,
    transaction,
  });
  const pendingTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator,
  });
  return pendingTxn.hash;
}

const getFaBalance = async (
  owner: Account,
  assetType: string
): Promise<number> => {
  const data = await aptos.getCurrentFungibleAssetBalances({
    options: {
      where: {
        owner_address: { _eq: owner.accountAddress.toStringLong() },
        asset_type: { _eq: assetType },
      },
    },
  });

  return data[0]?.amount ?? 0;
};

async function getMetadata(admin: Account): Promise<string> {
  const payload: InputViewFunctionData = {
    function: `${admin.accountAddress}::cabalcoin::get_metadata`,
    functionArguments: [],
  };
  const res = (await aptos.view<[{ inner: string }]>({ payload }))[0];
  return res.inner;
}

/* Make a number human-readable by formatting it with a decimal point */
function formatTokenAmount(
  rawAmount: bigint | number | string,
  decimals: number = 8
): string {
  const bn = BigInt(rawAmount);
  const divisor = 10n ** BigInt(decimals);
  const whole = bn / divisor;
  const fraction = bn % divisor;
  const fractionStr = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, ""); // trim trailing zeros

  return fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
}

async function main() {
  const alice = Account.generate();
  const bob = Account.generate();
  const charlie = Account.generate();
  const daniel = Account.generate();

  console.log(chalk.blue.bold("=== The Plot ===\n"));
  console.log("Welcome to CabalCoin, a claimable token for the chosen few!");
  await sleep(1000);
  console.log(
    "Only those on the allowlist can claim it, and the window is tight."
  );
  await sleep(1000);
  console.log("How will our players fare in this exclusive game?\n");
  await sleep(1000);
  console.log("Let's find out!");
  await sleep(2000);
  console.log(chalk.blue.bold("\n\n=== Our Developer ===\n"));
  console.log(`Alice: ${alice.accountAddress.toString()}`);
  console.log(chalk.blue.bold("\n\n=== Our Players ===\n"));
  console.log(`Bobert: ${bob.accountAddress.toString()}`);
  console.log(`Charles: ${charlie.accountAddress.toString()}`);
  console.log(`Daniel: ${daniel.accountAddress.toString()}`);

  await aptos.fundAccount({
    accountAddress: alice.accountAddress,
    amount: 100_000_000,
  });
  await aptos.fundAccount({
    accountAddress: bob.accountAddress,
    amount: 100_000_000,
  });
  await aptos.fundAccount({
    accountAddress: charlie.accountAddress,
    amount: 100_000_000,
  });
  await aptos.fundAccount({
    accountAddress: daniel.accountAddress,
    amount: 100_000_000,
  });

  console.log(chalk.blue.bold("\n\n=== Compiling CabalCoin ===\n"));
  compilePackage("move/cabalcoin", "move/cabalcoin/cabalcoin.json", [
    { name: "cabal_addr", address: alice.accountAddress },
  ]);

  const { metadataBytes, byteCode } = getPackageBytesToPublish(
    "move/cabalcoin/cabalcoin.json"
  );

  console.log(chalk.blue.bold("\n\n=== Publishing CabalCoin ===\n"));
  const transaction = await aptos.publishPackageTransaction({
    account: alice.accountAddress,
    metadataBytes,
    moduleBytecode: byteCode,
  });
  const response = await aptos.signAndSubmitTransaction({
    signer: alice,
    transaction,
  });
  console.log(`>>> Transaction hash: ${response.hash}`);
  await aptos.waitForTransaction({
    transactionHash: response.hash,
  });

  const metadataAddress = await getMetadata(alice);
  console.log(">>> Metadata address:", metadataAddress);

  console.log(chalk.blue.bold("\n\n=== Initial Player Balances ===\n"));
  console.log(
    chalk.bold(`* Bobert: ${await getFaBalance(bob, metadataAddress)} CBL`)
  );
  console.log(
    chalk.bold(`* Charles: ${await getFaBalance(charlie, metadataAddress)} CBL`)
  );
  console.log(
    chalk.bold(`* Daniel: ${await getFaBalance(daniel, metadataAddress)} CBL`)
  );
  console.log(chalk.blue.bold("\n\n=== Alice Starts the Show ===\n"));
  console.log(
    "She adds Bobert and Charles (but not Daniel) to the allowlist of 10 whole seconds!"
  );
  const currentTime = Math.floor(new Date().getTime() / 1000);
  const tenSecondsLater = currentTime + 10;

  const setAllowlistTransactionHash = await addToAllowList(
    alice,
    [bob.accountAddress, charlie.accountAddress],
    currentTime,
    tenSecondsLater
  );

  await aptos.waitForTransaction({
    transactionHash: setAllowlistTransactionHash,
  });

  console.log(chalk.blue.bold("\n\n=== Bobert ===\n"));

  console.log("Bobert initiates his claim...");
  const claimTransaction = await claimCoins(alice, bob);
  await aptos.waitForTransaction({
    transactionHash: claimTransaction,
  });
  await sleep(1000);
  const bobBalance = await getFaBalance(bob, metadataAddress);
  const formattedBalance = formatTokenAmount(bobBalance);
  console.log(chalk.bold(`Bobert's new balance: ${formattedBalance} CBL`));

  console.log("Uh oh, Bobert gets greedy and tries to claim again...");
  try {
    const bobClaimTransaction = await claimCoins(alice, bob);
    await aptos.waitForTransaction({
      transactionHash: bobClaimTransaction,
    });
  } catch (error) {
    console.log(
      chalk.red.bold(
        "Bobert's second claim failed:\n>>>",
        error.transaction.vm_status
      )
    );
    console.log("No double-dipping, Bobert!\n");
    const bobBalance = await getFaBalance(bob, metadataAddress);
    const formattedBalance = formatTokenAmount(bobBalance);
    console.log(
      chalk.bold(`Bobert's balance remains: ${formattedBalance} CBL\n`)
    );
  }
  console.log(chalk.blue.bold("\n\n=== Daniel ===\n"));
  console.log(
    "Daniel hears about CabalCoin in the groupchat and tries to claim..."
  );
  try {
    const danielClaimTransaction = await claimCoins(alice, daniel);
    await aptos.waitForTransaction({
      transactionHash: danielClaimTransaction,
    });
  } catch (error) {
    console.log(
      chalk.red.bold("Daniel's claim failed:\n>>>", error.transaction.vm_status)
    );
    console.log("Sadly for him, he's not part of the cabal. NGMI, Daniel :(\n");
  }
  await sleep(1000);
  const danielBalance = await getFaBalance(daniel, metadataAddress);
  console.log(chalk.bold(`Daniel's balance remains: ${danielBalance} CBL\n`));

  console.log(chalk.blue.bold("\n\n=== Charles ===\n"));

  console.log("Meanwhile, Charles is off IRL touching grass...");
  await sleep(4000);
  console.log(
    "Any minute now, Charles will check his phone and rush back to his computer..."
  );
  await sleep(5000);
  console.log(
    "Charles finally returns and initiates his claim, but will he make it in time?"
  );
  try {
    const charlieClaimTransaction = await claimCoins(alice, charlie);
    await aptos.waitForTransaction({
      transactionHash: charlieClaimTransaction,
    });
  } catch (error) {
    console.log(
      chalk.red.bold(
        "RIP! Charles' claim failed:\n>>>",
        error.transaction.vm_status
      )
    );
    console.log(
      "This is what happens when you step away from the computer, Charles!\n"
    );
  }
  const charlesBalance = await getFaBalance(charlie, metadataAddress);
  console.log(chalk.bold(`Charles' balance remains: ${charlesBalance} CBL\n`));

  console.log(chalk.blue.bold("\n\n=== The Final Score ===\n"));
  console.log(
    chalk.bold(
      `* Bobert's final balance: ${formatTokenAmount(
        await getFaBalance(bob, metadataAddress)
      )} CBL`
    )
  );
  console.log(
    chalk.bold(
      `* Charles' final balance: ${formatTokenAmount(
        await getFaBalance(charlie, metadataAddress)
      )} CBL`
    )
  );
  console.log(
    chalk.bold(
      `* Daniel's final balance: ${formatTokenAmount(
        await getFaBalance(daniel, metadataAddress)
      )} CBL`
    )
  );

  console.log(
    "\nCongratulations to Bobert for being the only one to successfully claim!\n\n"
  );
  console.log(chalk.blue.bold("\n=== FIN ===\n"));

  console.log(
    "We hope you've enjoyed our little story!\nPlease feel free to validate the final balances of our players below:\n\n"
  );

  console.log(
    `Bobert: https://explorer.aptoslabs.com/account/${bob.accountAddress.toStringLong()}/coins?network=devnet`
  );
  console.log(
    `Charles: https://explorer.aptoslabs.com/account/${charlie.accountAddress.toStringLong()}/coins?network=devnet`
  );
  console.log(
    `Daniel: https://explorer.aptoslabs.com/account/${daniel.accountAddress.toStringLong()}/coins?network=devnet`
  );
  console.log("\nThank you for reading!\n");
}

main();
