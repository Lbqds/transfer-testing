import {
  Address,
  Contract,
  DUST_AMOUNT,
  NodeProvider,
  ONE_ALPH,
  Script,
  SignerProvider,
  addressFromContractId,
  getContractIdFromUnsignedTx,
  stringToHex,
  waitForTxConfirmation,
  web3
} from '@alephium/web3'

function createTokenContract(symbol: string, name: string): string {
  return `
    Contract Token(totalSupply: U256) implements IFungibleToken {
      pub fn getSymbol() -> ByteVec {
        return #${stringToHex(symbol)}
      }

      pub fn getName() -> ByteVec {
        return #${stringToHex(name)}
      }

      pub fn getDecimals() -> U256 {
        return 18
      }

      pub fn getTotalSupply() -> U256 {
        return totalSupply
      }
    }

    @std(id = #0001)
    Interface IFungibleToken {
      pub fn getSymbol() -> ByteVec

      pub fn getName() -> ByteVec

      pub fn getDecimals() -> U256

      pub fn getTotalSupply() -> U256
    }
  `
}

const contractCode = createTokenContract('TestToken', 'TestToken')

let _contract: Contract | undefined = undefined

async function getContractArtifact(nodeProvider: NodeProvider): Promise<Contract> {
  if (_contract !== undefined) return _contract
  const compileResult = await nodeProvider.contracts.postContractsCompileContract({ code: contractCode })
  _contract = Contract.fromCompileResult(compileResult)
  return _contract
}

async function getScriptArtifact(nodeProvider: NodeProvider): Promise<Script> {
  const contract = await getContractArtifact(nodeProvider)
  const scriptCode = `
    TxScript Main(recipient: Address, totalSupply: U256) {
      let (encodedImmFields, encodedMutFields) = Token.encodeFields!(totalSupply)
      transferToken!(callerAddress!(), recipient, ALPH, dustAmount!())
      createContractWithToken!{callerAddress!() -> ALPH: 0.1 alph}(
        #${contract.bytecode},
        encodedImmFields,
        encodedMutFields,
        totalSupply,
        recipient
      )
    }
    ${contractCode}
  `
  const scriptResult = await nodeProvider.contracts.postContractsCompileScript({ code: scriptCode })
  return Script.fromCompileResult(scriptResult)
}

async function createAndTransferToken(
  nodeProvider: NodeProvider,
  deployer: SignerProvider,
  recipient: Address,
  amount: bigint
) {
  const script = await getScriptArtifact(nodeProvider)
  const params = await script.txParamsForExecution(deployer, {
    initialFields: { recipient, totalSupply: amount },
    attoAlphAmount: ONE_ALPH + DUST_AMOUNT
  })
  return await deployer.signAndSubmitExecuteScriptTx(params)
}

export async function mintToken(signer: SignerProvider, amount: bigint) {
  const nodeProvider = web3.getCurrentNodeProvider()
  const account = await signer.getSelectedAccount()
  const result = await createAndTransferToken(nodeProvider, signer, account.address, amount)
  await waitForTxConfirmation(result.txId, 1, 4000)
  const contractId = await getContractIdFromUnsignedTx(nodeProvider, result.unsignedTx)
  const tokenId = contractId
  return { ...result, tokenId, contractId, contractAddress: addressFromContractId(contractId) }
}