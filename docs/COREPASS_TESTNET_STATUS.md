# CorePass Testnet Status

Last updated: 2026-03-06
Status: Working conclusion for Core Cats execution planning

## Short Conclusion
1. CorePass developer-facing docs clearly assume Core Blockchain testnet support in parts of the Connector/Auth stack.
2. Core Blockchain itself clearly distinguishes `CB = mainnet`, `AB = testnet`, and `network id 3 = Devin`.
3. However, the currently available end-user CorePass mobile app in the active user environment exposes only a mainnet `cb...` account.
4. Because of that, CorePass desktop/mobile E2E on Devin cannot currently be treated as proven.
5. This does not block the rest of the project. It changes launch strategy.

## What Is Confirmed
1. CorePass deployment info documents `NETWORK_ID = 3` testnet-oriented environments.
   - https://docs.corepass.net/corepass-connector/deployment-info/
2. CorePass authorization docs use `ab...` examples for blockchain-facing identity data.
   - https://docs.corepass.net/corepass-connector/authorization/
3. CorePass protocol defines `corepass:sign` and `corepass:tx`.
   - https://docs.corepass.net/corepass-protocol/
4. Core Blockchain tooling/docs confirm:
   - `AB = testnet`
   - `CB = mainnet`
   - `network id 3 = Devin`
   - https://github.com/core-coin/go-core
   - https://github.com/core-coin/wallet-generator/blob/master/main.go
5. Historical CorePass material strongly suggests a test-oriented application/build existed for Devin-era testing.
   - https://medium.com/@corepasscc/corepass-live-test-data-ccacf71beedb

## What Is Not Confirmed
1. That the currently distributed App Store / Play Store CorePass build can switch to Devin testnet.
2. That the currently distributed mobile app can show or operate an `ab...` account.
3. That `corepass:sign` / `corepass:tx` can be executed on Devin from the currently distributed app build.

## Practical Impact on Core Cats
1. Continue Core Devin validation for:
   - contracts
   - randomness
   - signer/relayer
   - tokenURI/SVG
   - viewer/UI behavior except the final wallet hop
2. Keep the CorePass-first `/mint` implementation as the production-target UX.
3. Do not claim CorePass Devin E2E is complete until a testnet-capable CorePass path is demonstrated.
4. Plan for a controlled mainnet canary if CorePass testnet remains unavailable.

## TestFlight Note
1. An old TestFlight build from years ago should not be assumed to be recoverable.
2. Apple TestFlight builds are time-limited; tester builds expire after 90 days.
3. Therefore, an old historical CorePass test build is only useful if the team reissues access or republishes a fresh test build.
4. Sources:
   - https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview
   - https://support.apple.com/en-us/118533

## Operational Decision
1. Do not wait on CorePass testnet certainty before continuing contract and transparency work.
2. Keep CorePass inquiry open as an external dependency.
3. Before public launch, choose one of two paths:
   - confirmed CorePass testnet path, then full Devin E2E
   - or controlled mainnet canary, then broader public mint
