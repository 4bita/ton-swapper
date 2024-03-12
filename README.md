# Swapper service created for Evaa Protocol Hackathon 2023
This service allows automatically rebalance user tokens such as TON, jUSDT and jUSDC.
It leverages DeDust and StoneFi API (+ Orbs api for connection to a Ton node).  
When user has not enough jUSDT or jUSDC tokens, the service will
automatically swap Ton reserves and buy necessary jettons. When
a user has too a lot jetton tokens (specified in config.ts), they
will be swapped to TONs.

## Setup
- Create .env file and set WALLET_PRIVATE_KEY there
- Install app dependencies: `npm i`

## Start swapper service
`npm run start`