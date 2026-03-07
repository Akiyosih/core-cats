# CorePass Contact Draft

Purpose: External confirmation request about CorePass mobile app support for Core Blockchain Devin testnet.

## English Draft

Subject: Question about CorePass mobile app support for Core Blockchain Devin testnet (`ab...`, network id 3)

Hello,

I am developing a fully on-chain NFT project on Core Blockchain (the core-coin ecosystem, not CoreDAO), and I need to confirm whether the current CorePass mobile app can actually be used with Devin testnet accounts.

What I have confirmed so far:
1. CorePass Connector documentation references testnet-oriented environments with network id 3.
2. CorePass authorization examples use `ab...`-style blockchain identifiers.
3. Core Blockchain documentation/tooling distinguishes `CB = mainnet`, `AB = testnet`, and `network id 3 = Devin`.

However, in the currently available CorePass mobile app in my environment, I only see a mainnet `cb...` account and I do not see a Devin testnet `ab...` account or an obvious network switch.

Could you please clarify the following:
1. Does the currently distributed CorePass mobile app support Devin testnet accounts?
2. If yes, how can a user switch to Devin testnet or display an `ab...` account?
3. If this requires a separate test build, TestFlight build, staging build, or different package/bundle id, what is the correct app/build to use?
4. Can the current mobile app execute `corepass:sign` and `corepass:tx` flows against Devin testnet in practice?
5. If possible, could you share a minimal reproducible example or screenshot showing Devin/testnet operation in the mobile app?

This would help determine whether our final pre-mainnet validation can be done on testnet or whether we need to use a controlled mainnet canary launch.

Thank you.

## Japanese Draft

件名: CorePass モバイルアプリの Core Blockchain Devin testnet（`ab...`, network id 3）対応について

こんにちは。

私は Core Blockchain（core-coin エコシステム。CoreDAO とは無関係です）上で、フルオンチェーンNFTプロジェクトを開発しています。
CorePass モバイルアプリが、Devin testnet 用アカウントとして実際に利用できるのかを確認したく、ご連絡しました。

現時点で確認できていること:
1. CorePass Connector のドキュメントには、network id 3 の testnet 系環境の記載があります。
2. CorePass Authorization の例では `ab...` 系の blockchain identifier が使われています。
3. Core Blockchain 側のドキュメント・ツールでは、`CB = mainnet`, `AB = testnet`, `network id 3 = Devin` と区別されています。

ただし、私の環境で現在利用できる CorePass モバイルアプリでは、mainnet の `cb...` アカウントしか見えず、Devin testnet の `ab...` アカウントや、分かりやすい network 切替も確認できません。

以下についてご教示いただけますでしょうか。
1. 現在配布されている CorePass モバイルアプリは、Devin testnet アカウントに対応していますか。
2. 対応している場合、どのように Devin testnet へ切り替える、または `ab...` アカウントを表示するのでしょうか。
3. もし別の test build、TestFlight build、staging build、または別 package / bundle id が必要であれば、正しいアプリ/ビルドを教えてください。
4. 現在のモバイルアプリで、`corepass:sign` と `corepass:tx` を Devin testnet に対して実際に実行できますか。
5. 可能であれば、モバイルアプリ上で Devin/testnet を利用している最小の再現例やスクリーンショットをご共有いただけますか。

この確認ができると、mainnet 前の最終検証を testnet で完結できるか、あるいは controlled mainnet canary launch を前提にすべきかを判断できます。

よろしくお願いいたします。
