import { Destination, ONE_ALPH, SignerProvider, TOTAL_NUMBER_OF_GROUPS, TransactionBuilder, web3 } from "@alephium/web3";
import { PrivateKeyWallet } from "@alephium/web3-wallet";

function genDestinations(tokenId: string): Destination[][] {
  const allDestinations: Destination[][] = []
  for (let group = 0; group < TOTAL_NUMBER_OF_GROUPS; group += 1) {
    const destinations: Destination[] = Array.from(Array(20).keys()).map(() => {
      const address = PrivateKeyWallet.Random(group).address
      return { address, attoAlphAmount: ONE_ALPH / 10n, tokens: [{ id: tokenId, amount: ONE_ALPH }] }
    })
    // transfer twice to each group
    allDestinations.push(destinations)
    allDestinations.push(destinations)
  }
  return allDestinations
}

export async function transfer(signer: SignerProvider, tokenId: string) {
  const account = await signer.getSelectedAccount()
  const allDestinations = genDestinations(tokenId)
  const txBuilder = TransactionBuilder.from(signer.nodeProvider ?? web3.getCurrentNodeProvider())
  for (const destinations of allDestinations) {
    const buildResult = await txBuilder.buildTransferTx(
      {
        signerAddress: account.address,
        destinations
      },
      account.publicKey
    )
    const txResult = await signer.signAndSubmitUnsignedTx({
      signerAddress: account.address,
      unsignedTx: buildResult.unsignedTx
    })
    console.log(`tx id: ${txResult.txId}`)
  }
}