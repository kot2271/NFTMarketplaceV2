# NFT MarketplaceV2

## Installation

Clone the repository using the following command:
Install the dependencies using the following command:
```shell
npm i
```

## Deployment

Fill in all the required environment variables(copy .env-example to .env and fill it). 

Deploy contract to the chain (polygon-mumbai):
```shell
npx hardhat run scripts/deploy/deploy.ts --network polygonMumbai
```

## Verify

Verify the installation by running the following command:
```shell
npx hardhat verify --network polygonMumbai {CONTRACT_ADDRESS}
```

## Tasks

Create a new task(s) and save it(them) in the folder "tasks". Add a new task_name in the file "tasks/index.ts"

Running a grantArtistRole task:
```shell
npx hardhat grantArtistRole --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --to {GRANT_ROLE_TO} --network polygonMumbai
```

Running a createCollection task:
```shell
npx hardhat createCollection --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --name {COLLECTION_NAME} --symbol {COLLECTION_SYMBOL} --network polygonMumbai
```

Running a createItem task:
```shell
npx hardhat createItem --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --collection-id {COLLECTION_ID} --token-uri {TOKEN_URI} --network polygonMumbai
```

Running a listItem task:
```shell
npx hardhat listItem --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --collection-id {COLLECTION_ID} --token-id {NFT_TOKEN_ID} --price {PRICE_IN_ETH} --payment-token {PAYMENT_TOKEN_ADDRESS} --network polygonMumbai
```

Running a approveERC721 task:
```shell
npx hardhat approveERC721 --contract {ERC721_CONTRACT_ADDRESS} --to {ADDRESS_TO_GRANT_PERMISSION} --token-id {TOKEN_ID} --network polygonMumbai
```

Running a approveERC20 task:
```shell
npx hardhat approveERC20 --token {TOKEN_ADDRESS} --spender {SPENDER_ADDRESS} --amount {AMOUNT_IN_ETHER} --network polygonMumbai
```

Running a buyItem task:
```shell
npx hardhat buyItem --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --collection-id {COLLECTION_ID} --token-id {NFT_TOKEN_ID} --payment-token {PAYMENT_TOKEN_ADDRESS} --value {VALUE_IN_ETH} --network polygonMumbai
```

Running a cancelListing task:
```shell
npx hardhat cancelListing --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --collection-id {COLLECTION_ID} --token-id {NFT_TOKEN_ID} --network polygonMumbai
```

Running a listItemOnAuction task:
```shell
npx hardhat listItemOnAuction --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --collection-id {COLLECTION_ID} --token-id {NFT_TOKEN_ID} --price {PRICE_IN_ETH} --step {BID_INCREMENT_STEP} --token-address {PAYMENT_TOKEN_ADDRESS} --network polygonMumbai
```

Running a makeBid task:
```shell
npx hardhat makeBid --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --collection-id {COLLECTION_ID} --token-id {NFT_TOKEN_ID} --bid-amount {AMOUNT_IN_ETH} --payment-token {PAYMENT_TOKEN_ADDRESS} --network polygonMumbai
```

Running a cancelAuction task:
```shell
npx hardhat cancelAuction --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --collection-id {COLLECTION_ID} --token-id {NFT_TOKEN_ID} --network polygonMumbai
```

Running a finishAuction task:
```shell
npx hardhat finishAuction --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --collection-id {COLLECTION_ID} --token-id {NFT_TOKEN_ID} --network polygonMumbai
```
