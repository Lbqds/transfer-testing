import React, { useCallback, useState } from 'react'
import { FC } from 'react'
import { useWallet } from '@alephium/web3-react'
import { mintToken } from '@/mint-token'
import { ONE_ALPH } from '@alephium/web3'
import { transfer } from '@/transfer'

export const TokenDapp: FC = () => {
  const { signer } = useWallet()
  const [tokenId, setTokenId] = useState<string>()

  const onMintToken = useCallback(async () => {
    if (signer) {
      const result = await mintToken(signer, ONE_ALPH * 10000n)
      setTokenId(result.contractId)
    }
  }, [signer])

  const onTransfer = useCallback(() => {
    if (signer && tokenId) {
      transfer(signer, tokenId)
    }
  }, [tokenId, signer])

  return (
    <>
      <div className="columns">
        <button className="button" onClick={onMintToken} disabled={tokenId !== undefined}>Mint Token</button>
        <button className="button" onClick={onTransfer} disabled={tokenId === undefined}>Transfer</button>
      </div>
    </>
  )
}
