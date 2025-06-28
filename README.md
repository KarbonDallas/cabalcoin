# Cabal Coin

This project implements a simple Fungible Asset that can only be claimed via allowlist.
The allowlist is managed by the developer, who can add addresses and define the claim start / end times.

Successful claimants receive 100 CabalCoin (CBL)

## Installation

Simply install the dependencies:

`npm install`

## Usage

We have just one script, which takes us on a little journey to illustrate how CabalCoin functions:

`npm run cabal`

This command:

- Compiles the module.
- Creates the developer, Alice.
- Creates the players:
  - Bobert
  - Charles
  - Daniel
- Publishes the module under Alice's account.
- Unleashes the players to interact with the module.
- Finishes with explorer links to resulting account balances.

## Sample Output

```
=== The Plot ===

Welcome to CabalCoin, a claimable token for the chosen few!
Only those on the allowlist can claim it, and the window is tight.
How will our players fare in this exclusive game?

Let's find out!


=== Our Developer ===

Alice: 0x6e275c79830a2694b4042ea6d807662e84d307fc4fdb030861587762ebf2cc38


=== Our Players ===

Bobert: 0x94b32a36993c1b2bc123fbecc8471c1a4af9dc9fd9c594a9e8d5ab527583e23e
Charles: 0xd7385903ae1473b65c5166b3f4e955193eedfe5fc58483392f55298d6e47ed35
Daniel: 0x7f6233e91f825cbc89b9bb2981f78f7ca5708d413fd6d1f1ce4daad5d7cdb9c0


=== Compiling CabalCoin ===

Compiling, may take a little while to download git dependencies...
UPDATING GIT DEPENDENCY https://github.com/aptos-labs/aptos-framework.git
INCLUDING DEPENDENCY AptosFramework
INCLUDING DEPENDENCY AptosStdlib
INCLUDING DEPENDENCY MoveStdlib
BUILDING cabalcoin


=== Publishing CabalCoin ===

>>> Transaction hash: 0x7e6d8bd0874f9766b400378fda0dcfe038c0ca09480af80ef142412992431524
>>> Metadata address: 0x566aea57f0477b67a5bee1aef26dc3eedab7cc5a86e7c58de3744d7776d08801


=== Initial Player Balances ===

* Bobert: 0
* Charles: 0
* Daniel: 0


=== Alice Starts the Show ===

She adds Bobert and Charles (but not Daniel) to the allowlist of 10 whole seconds!


=== Bobert ===

Bobert initiates his claim...
Bobert's new balance: 100
Uh oh, Bobert gets greedy and tries to claim again...
Bobert's second claim failed:
>>> Move abort in 0x6e275c79830a2694b4042ea6d807662e84d307fc4fdb030861587762ebf2cc38::cabalcoin: EALREADY_CLAIMED(0x30003):
No double-dipping, Bobert!

Bobert's balance remains: 100



=== Daniel ===

Daniel hears about CabalCoin in the groupchat and tries to claim...
Daniel's claim failed:
>>> Move abort in 0x6e275c79830a2694b4042ea6d807662e84d307fc4fdb030861587762ebf2cc38::cabalcoin: ENOT_ON_ALLOWLIST(0x50002):
Sadly for him, he's not part of the cabal. NGMI, Daniel :(

Daniel's balance remains: 0



=== Charles ===

Meanwhile, Charles is off IRL touching grass...
Any minute now, Charles will check his phone and rush back to his computer...
Charles finally returns and initiates his claim, but will he make it in time?
RIP! Charles' claim failed:
>>> Move abort in 0x6e275c79830a2694b4042ea6d807662e84d307fc4fdb030861587762ebf2cc38::cabalcoin: EOUTSIDE_CLAIM_PERIOD(0x30004):
This is what happens when you step away from the computer, Charles!

Charles' balance remains: 0



=== The Final Score ===

* Bobert's final balance: 100
* Charles' final balance: 0
* Daniel's final balance: 0

Congratulations to Bobert for being the only one to successfully claim!



=== FIN ===

We hope you've enjoyed our little story!
Please feel free to validate the final balances of our players below:


Bobert: https://explorer.aptoslabs.com/account/0x94b32a36993c1b2bc123fbecc8471c1a4af9dc9fd9c594a9e8d5ab527583e23e/coins?network=devnet
Charles: https://explorer.aptoslabs.com/account/0xd7385903ae1473b65c5166b3f4e955193eedfe5fc58483392f55298d6e47ed35/coins?network=devnet
Daniel: https://explorer.aptoslabs.com/account/0x7f6233e91f825cbc89b9bb2981f78f7ca5708d413fd6d1f1ce4daad5d7cdb9c0/coins?network=devnet

Thank you for reading!
```

# Acknowledgement

This project was built from the aptos node app template `create-aptos-dapp` and cribbed from the example code in the Aptos TS SDK.

More info here:

- https://aptos.dev/en/build/create-aptos-dapp
- https://github.com/aptos-labs/aptos-ts-sdk
