# Swapper service created for Evaa Protocol Hackathon 2023
This service allows automatically rebalance user tokens such as TON, jUSDT and jUSDC.
It leverages DeDust and StoneFi API (+ Orbs api for connection to a Ton node).  
When user has not enough jUSDT or jUSDC tokens, the service will
automatically swap Ton reserves and buy necessary jettons. When
a user has too a lot jetton tokens (specified in index.ts), they
will be swapped to TONs.

## Setup
- Set necessary configs (such as WALLET_PRIVATE_KEY and TONAPI_KEY) in .env file at the root
- Install app dependencies: `npm i`

## Start bot
`npm run start`