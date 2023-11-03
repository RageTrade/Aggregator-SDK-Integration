/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type {
  ReaderPricingUtils,
  ReaderPricingUtilsInterface,
} from "../../../contracts/reader/ReaderPricingUtils";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "market",
        type: "address",
      },
    ],
    name: "DisabledMarket",
    type: "error",
  },
  {
    inputs: [],
    name: "EmptyMarket",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "market",
        type: "address",
      },
    ],
    name: "InvalidSwapMarket",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenIn",
        type: "address",
      },
      {
        internalType: "address",
        name: "market",
        type: "address",
      },
    ],
    name: "InvalidTokenIn",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "x",
        type: "uint256",
      },
    ],
    name: "PRBMathUD60x18__Exp2InputTooBig",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "x",
        type: "uint256",
      },
    ],
    name: "PRBMathUD60x18__LogInputTooSmall",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "prod1",
        type: "uint256",
      },
    ],
    name: "PRBMath__MulDivFixedPointOverflow",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "address",
        name: "market",
        type: "address",
      },
    ],
    name: "UnableToGetCachedTokenPrice",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "inputToken",
        type: "address",
      },
      {
        internalType: "address",
        name: "market",
        type: "address",
      },
    ],
    name: "UnableToGetOppositeToken",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "int256",
        name: "usdDelta",
        type: "int256",
      },
      {
        internalType: "uint256",
        name: "poolUsd",
        type: "uint256",
      },
    ],
    name: "UsdDeltaExceedsPoolValue",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "contract DataStore",
        name: "dataStore",
        type: "DataStore",
      },
      {
        components: [
          {
            internalType: "address",
            name: "marketToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "indexToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "longToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "shortToken",
            type: "address",
          },
        ],
        internalType: "struct Market.Props",
        name: "market",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "max",
            type: "uint256",
          },
        ],
        internalType: "struct Price.Props",
        name: "indexTokenPrice",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "positionSizeInUsd",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "positionSizeInTokens",
        type: "uint256",
      },
      {
        internalType: "int256",
        name: "sizeDeltaUsd",
        type: "int256",
      },
      {
        internalType: "bool",
        name: "isLong",
        type: "bool",
      },
    ],
    name: "getExecutionPrice",
    outputs: [
      {
        components: [
          {
            internalType: "int256",
            name: "priceImpactUsd",
            type: "int256",
          },
          {
            internalType: "uint256",
            name: "priceImpactDiffUsd",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "executionPrice",
            type: "uint256",
          },
        ],
        internalType: "struct ReaderPricingUtils.ExecutionPriceResult",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract DataStore",
        name: "dataStore",
        type: "DataStore",
      },
      {
        components: [
          {
            internalType: "address",
            name: "marketToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "indexToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "longToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "shortToken",
            type: "address",
          },
        ],
        internalType: "struct Market.Props",
        name: "market",
        type: "tuple",
      },
      {
        components: [
          {
            components: [
              {
                internalType: "uint256",
                name: "min",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "max",
                type: "uint256",
              },
            ],
            internalType: "struct Price.Props",
            name: "indexTokenPrice",
            type: "tuple",
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "min",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "max",
                type: "uint256",
              },
            ],
            internalType: "struct Price.Props",
            name: "longTokenPrice",
            type: "tuple",
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "min",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "max",
                type: "uint256",
              },
            ],
            internalType: "struct Price.Props",
            name: "shortTokenPrice",
            type: "tuple",
          },
        ],
        internalType: "struct MarketUtils.MarketPrices",
        name: "prices",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "tokenIn",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "uiFeeReceiver",
        type: "address",
      },
    ],
    name: "getSwapAmountOut",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "feeReceiverAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "feeAmountForPool",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amountAfterFees",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "uiFeeReceiver",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "uiFeeReceiverFactor",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "uiFeeAmount",
            type: "uint256",
          },
        ],
        internalType: "struct SwapPricingUtils.SwapFees",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract DataStore",
        name: "dataStore",
        type: "DataStore",
      },
      {
        components: [
          {
            internalType: "address",
            name: "marketToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "indexToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "longToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "shortToken",
            type: "address",
          },
        ],
        internalType: "struct Market.Props",
        name: "market",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "tokenIn",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenOut",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "max",
            type: "uint256",
          },
        ],
        internalType: "struct Price.Props",
        name: "tokenInPrice",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "min",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "max",
            type: "uint256",
          },
        ],
        internalType: "struct Price.Props",
        name: "tokenOutPrice",
        type: "tuple",
      },
    ],
    name: "getSwapPriceImpact",
    outputs: [
      {
        internalType: "int256",
        name: "priceImpactUsdBeforeCap",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "priceImpactAmount",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x612fd661003a600b82828239805160001a60731461002d57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe730000000000000000000000000000000000000000301460806040526004361061004b5760003560e01c8063146fa98e1461005057806381eba89e1461008a578063dafa66bf146100b2575b600080fd5b61006361005e366004612836565b610124565b60408051825181526020808401519082015291810151908201526060015b60405180910390f35b61009d6100983660046128b3565b6102f9565b60408051928352602083019190915201610081565b6100c56100c036600461293e565b6103d9565b604080519384526020808501939093528151848201529181015160608085019190915291810151608080850191909152918101516001600160a01b031660a0808501919091529181015160c0840152015160e082015261010001610081565b61012c61242f565b610134612450565b80516001600160a01b038a1690526020810188905261016361015585610666565b604083810151602001510152565b6040818101510151831515905260008085139081610182578415610184565b845b90506101a881610195576000610199565b6000195b60408501516020015160a00152565b6080830180516020908101518a9052815181015101889052516040015185151590526101d261242f565b60008713156102635760405163358daa8960e01b815273__$91a1a7f12f728c8759f4be979bae55555f$__9063358daa89906102149087908e90600401612cad565b608060405180830381865af4158015610231573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906102559190612dc2565b6040850152505081526102ea565b60405163103b6c3760e31b815273__$91a1a7f12f728c8759f4be979bae55555f$__906381db61b89061029c9087908e90600401612cad565b606060405180830381865af41580156102b9573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906102dd9190612df8565b6040840152602083015281525b9b9a5050505050505050505050565b6000806103966040518061010001604052808b6001600160a01b031681526020018a8152602001896001600160a01b03168152602001886001600160a01b0316815260200161034787610681565b815260200161035586610681565b815260200161037561036688610681565b610370908a612e3c565b6106a3565b815260200161038661036688610681565b61038f90612e53565b905261070d565b915060008213156103b9576103b28989600001518886866107eb565b90506103cd565b6103ca8989600001518987866107eb565b90505b97509795505050505050565b6000806103e46124e6565b6103ec612525565b88604001516001600160a01b0316876001600160a01b031614158015610428575088606001516001600160a01b0316876001600160a01b031614155b156104535788516040516353f8171160e01b815261044a918991600401612e6f565b60405180910390fd5b61045d8a8a61084f565b610467878a61089a565b6001600160a01b0316815261047d878a8a610909565b6020820152805161048f908a8a610909565b816040018190525060006105326040518061010001604052808d6001600160a01b031681526020018c81526020018a6001600160a01b0316815260200184600001516001600160a01b031681526020016104ec8560200151610681565b81526020016104fe8560400151610681565b815260200161051d6105138660200151610681565b610370908c612e3c565b81526020016103866105138660200151610681565b9050600061054a8c8c600001518a600086138b6109aa565b90506000808313156105dc5760408083015160608601819052908501516020908101519086015151909161057e9190612e3c565b6105889190612e9f565b84608001818152505083608001518460a00181815250506105b88d8d6000015186600001518760400151876107eb565b90506105c381610b7d565b846080018181516105d49190612eb3565b90525061064d565b6105f18d8d600001518c8760200151876107eb565b90506106046105ff82612e53565b610b7d565b82604001516106139190612ec6565b606085018190526040850151602090810151908601515190916106369190612e3c565b6106409190612e9f565b6080850181905260a08501525b608093909301519c929b50995090975050505050505050565b600080821215610679578160000361067b565b815b92915050565b60006002826000015183602001516106999190612eb3565b61067b9190612e9f565b60006001600160ff1b038211156106795760405162461bcd60e51b815260206004820152602860248201527f53616665436173743a2076616c756520646f65736e27742066697420696e2061604482015267371034b73a191a9b60c11b606482015260840161044a565b60008061071983610bcf565b905060006107308460000151856020015184610c20565b905060008112610741579392505050565b600080600061075c8760000151886020015160000151610d3e565b9250925092508261077257509195945050505050565b6000808860200151604001516001600160a01b031689604001516001600160a01b0316036107a45750829050816107aa565b50819050825b60006107b78a8484610ed6565b905060006107ce8b600001518c6020015184610c20565b90508781126107dd57876102ea565b9a9950505050505050505050565b60008060008313156108345761080484602001516106a3565b61080e9084612ed9565b90506000610820610370898989610ff4565b90508082131561082e578091505b50610845565b61084283856000015161106e565b90505b9695505050505050565b61085982826110e2565b80606001516001600160a01b031681604001516001600160a01b0316036108965780516040516332e6f44d60e21b815261044a9190600401612f07565b5050565b600081604001516001600160a01b0316836001600160a01b0316036108c45750606081015161067b565b81606001516001600160a01b0316836001600160a01b0316036108ec5750604081015161067b565b8151604051637a0ca68160e01b815261044a918591600401612e6f565b61091161257f565b82604001516001600160a01b0316846001600160a01b031603610939575060208101516109a3565b82606001516001600160a01b0316846001600160a01b031603610961575060408101516109a3565b82602001516001600160a01b0316846001600160a01b031603610986575080516109a3565b8251604051635f2394d160e11b815261044a918691600401612e6f565b9392505050565b6109b26124e6565b6109ba6124e6565b6000876001600160a01b031663bd02d0f56109d589886111b0565b6040518263ffffffff1660e01b81526004016109f391815260200190565b602060405180830381865afa158015610a10573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610a349190612f1b565b90506000886001600160a01b031663bd02d0f5604051602001610a839060208082526018908201527729aba0a82fa322a2afa922a1a2a4ab22a92fa320a1aa27a960411b604082015260600190565b604051602081830303815290604052805190602001206040518263ffffffff1660e01b8152600401610ab791815260200190565b602060405180830381865afa158015610ad4573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610af89190612f1b565b90506000610b068884611239565b9050610b128183611239565b808552610b1f9082612ec6565b60208501526001600160a01b0386166060850152610b3d8a87611252565b60808501819052610b4f908990611239565b60a08501819052610b60828a612ec6565b610b6a9190612ec6565b6040850152509198975050505050505050565b6000808212156106795760405162461bcd60e51b815260206004820181905260248201527f53616665436173743a2076616c7565206d75737420626520706f736974697665604482015260640161044a565b610bd7612599565b6000610bf08360000151846020015185604001516113a3565b90506000610c0b8460000151856020015186606001516113a3565b9050610c18848383610ed6565b949350505050565b600080610c3583600001518460200151611441565b90506000610c4b84604001518560600151611441565b60608501516040860151602087015187518951949550111591101514906000906001600160a01b0389169063bd02d0f590610c8590611463565b6040518263ffffffff1660e01b8152600401610ca391815260200190565b602060405180830381865afa158015610cc0573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610ce49190612f1b565b90508115610d1c57865184841090600090610d01908b90846114ee565b9050610d0f86868386611515565b96505050505050506109a3565b600080610d2d8a8a60000151611553565b91509150610d0f8686848487611667565b600080600080856001600160a01b031663a6ed563e610d5c876116a2565b6040518263ffffffff1660e01b8152600401610d7a91815260200190565b602060405180830381865afa158015610d97573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610dbb9190612f1b565b905080610dd357600080600093509350935050610ecf565b6001866001600160a01b031663bd02d0f5610def8460016116d9565b6040518263ffffffff1660e01b8152600401610e0d91815260200190565b602060405180830381865afa158015610e2a573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610e4e9190612f1b565b876001600160a01b031663bd02d0f5610e688560006116d9565b6040518263ffffffff1660e01b8152600401610e8691815260200190565b602060405180830381865afa158015610ea3573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610ec79190612f1b565b935093509350505b9250925092565b610ede612599565b6000846080015184610ef09190612e3c565b905060008560a0015184610f049190612e3c565b905060008660c00151128015610f29575081610f278760c001516105ff90612e53565b115b15610f575760c0860151604051632e94940960e01b815260048101919091526024810183905260440161044a565b60008660e00151128015610f7a575080610f788760e001516105ff90612e53565b115b15610fa85760e0860151604051632e94940960e01b815260048101919091526024810182905260440161044a565b6000610fb8838860c0015161174b565b90506000610fca838960e0015161174b565b60408051608081018252958652602086019490945292840191909152506060820152949350505050565b6000836001600160a01b031663bd02d0f561100f858561177b565b6040518263ffffffff1660e01b815260040161102d91815260200190565b602060405180830381865afa15801561104a573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610c189190612f1b565b6000808312156110b057611081826106a3565b61108a836106a3565b6110949085612f34565b61109f906001612f5b565b6110a99190612ed9565b905061067b565b6110b9826106a3565b60016110c4846106a3565b6110ce9086612f5b565b6110d89190612f34565b6109a39190612ed9565b80516001600160a01b031661110a576040516302fde0d760e11b815260040160405180910390fd5b6000826001600160a01b0316637ae1cfca61112884600001516117f5565b6040518263ffffffff1660e01b815260040161114691815260200190565b602060405180830381865afa158015611163573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906111879190612f83565b905080156111ab5781516040516309f8c93760e01b815261044a9190600401612f07565b505050565b60006040516020016111e5906020808252600f908201526e29aba0a82fa322a2afa320a1aa27a960891b604082015260600190565b60408051601f198184030181528282528051602091820120908301526001600160a01b0385169082015282151560608201526080015b60405160208183030381529060405280519060200120905092915050565b60006109a3838368327cb2734119d3b7a9601e1b61182d565b600080836001600160a01b031663bd02d0f56040516020016112999060208082526011908201527026a0ac2faaa4afa322a2afa320a1aa27a960791b604082015260600190565b604051602081830303815290604052805190602001206040518263ffffffff1660e01b81526004016112cd91815260200190565b602060405180830381865afa1580156112ea573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061130e9190612f1b565b90506000846001600160a01b031663bd02d0f561132a8661183a565b6040518263ffffffff1660e01b815260040161134891815260200190565b602060405180830381865afa158015611365573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906113899190612f1b565b9050818110611398578161139a565b805b95945050505050565b6000806113b88460400151856060015161186d565b905080856001600160a01b031663bd02d0f56113d887600001518761189c565b6040518263ffffffff1660e01b81526004016113f691815260200190565b602060405180830381865afa158015611413573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906114379190612f1b565b61139a9190612e9f565b6000818311611459576114548383612ec6565b6109a3565b6109a38284612ec6565b60006040516020016114a4906020808252601b908201527a29aba0a82fa4a6a820a1aa2fa2ac2827a722a72a2fa320a1aa27a960291b604082015260600190565b60408051601f198184030181528282528051602091820120908301526001600160a01b03841690820152606001604051602081830303815290604052805190602001209050919050565b60008060006114fd8686611553565b915091508361150c5780610845565b50949350505050565b6000848410816115396115298887876118cd565b6115348888886118cd565b611441565b9050600061154782846118e6565b98975050505050505050565b6000806000846001600160a01b031663bd02d0f5611572866001611909565b6040518263ffffffff1660e01b815260040161159091815260200190565b602060405180830381865afa1580156115ad573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906115d19190612f1b565b90506000856001600160a01b031663bd02d0f56115ef876000611909565b6040518263ffffffff1660e01b815260040161160d91815260200190565b602060405180830381865afa15801561162a573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061164e9190612f1b565b90508082111561165c578091505b909590945092505050565b6000806116758786856118cd565b905060006116848786866118cd565b905060006116928383611441565b905060006107dd828486116118e6565b60006040516020016114a4906020808252601190820152701592549515505317d3505492d15517d251607a1b604082015260600190565b600060405160200161171a906020808252601b908201527a5649525455414c5f494e56454e544f52595f464f525f535741505360281b604082015260600190565b60408051601f198184030181528282528051602091820120908301528101849052821515606082015260800161121b565b6000808213156117685761175e82610666565b6110a99084612eb3565b61177182610666565b6109a39084612ec6565b60006040516020016117b89060208082526017908201527614d5d05417d253541050d517d413d3d317d05353d55395604a1b604082015260600190565b60408051601f198184030181528282528051602091820120908301526001600160a01b03808616918301919091528316606082015260800161121b565b60006040516020016114a4906020808252601290820152711254d7d3505492d15517d11254d05093115160721b604082015260600190565b6000610c18848484611941565b60006040516020016114a4906020808252600d908201526c2aa4afa322a2afa320a1aa27a960991b604082015260600190565b6000816001600160a01b0316836001600160a01b03161461188f576001611892565b60025b60ff169392505050565b60006040516020016117b8906020808252600b908201526a1413d3d317d05353d5539560aa1b604082015260600190565b6000806118da8584611a2b565b905061139a8185611239565b600081156118f7576110a9836106a3565b611900836106a3565b6110a990612e53565b60006040516020016111e59060208082526012908201527129aba0a82fa4a6a820a1aa2fa320a1aa27a960711b604082015260600190565b600080806000198587098587029250828110838203039150508060000361197b5783828161197157611971612e89565b04925050506109a3565b8084116119c25760405162461bcd60e51b81526020600482015260156024820152744d6174683a206d756c446976206f766572666c6f7760581b604482015260640161044a565b60008486880960026001871981018816978890046003810283188082028403028082028403028082028403028082028403028082028403029081029092039091026000889003889004909101858311909403939093029303949094049190911702949350505050565b600068327cb2734119d3b7a9601e1b831015611a495750600061067b565b68327cb2734119d3b7a9601e1b8203611a6357508161067b565b6000611a7f611a7185611a8a565b611a7a85611a8a565b611a9b565b9050610c1881611adb565b600061067b64e8d4a5100083612e9f565b600082600003611ac1578115611ab25760006110a9565b50670de0b6b3a764000061067b565b6109a3611ad6611ad085611aec565b84611ba2565b611bae565b600061067b64e8d4a5100083612e3c565b6000670de0b6b3a7640000821015611b1a57604051633621413760e21b81526004810183905260240161044a565b6000611b2f670de0b6b3a76400008404611bf4565b670de0b6b3a764000081029250905082811c670de0b6b3a763ffff198101611b58575050919050565b6706f05b59d3b200005b8015611b9a57670de0b6b3a7640000828002049150671bc16d674ec800008210611b92579283019260019190911c905b60011c611b62565b505050919050565b60006109a38383611cd7565b6000680a688906bd8b0000008210611bdc57604051634a4f26f160e01b81526004810183905260240161044a565b670de0b6b3a7640000604083901b046109a381611d9d565b6000600160801b8210611c1457608091821c91611c119082612eb3565b90505b600160401b8210611c3257604091821c91611c2f9082612eb3565b90505b600160201b8210611c5057602091821c91611c4d9082612eb3565b90505b620100008210611c6d57601091821c91611c6a9082612eb3565b90505b6101008210611c8957600891821c91611c869082612eb3565b90505b60108210611ca457600491821c91611ca19082612eb3565b90505b60048210611cbf57600291821c91611cbc9082612eb3565b90505b60028210611cd25761067b600182612eb3565b919050565b60008080600019848609848602925082811083820303915050670de0b6b3a76400008110611d1b5760405163698d9a0160e11b81526004810182905260240161044a565b600080670de0b6b3a764000086880991506706f05b59d3b1ffff8211905082600003611d595780670de0b6b3a764000085040194505050505061067b565b620400008285030493909111909103600160ee1b02919091177faccb18165bd6fe31ae1cf318dc5b51eee0e1ba569b88cd74c1773b91fac106690201905092915050565b600160bf1b6001603f1b821615611dbd5768016a09e667f3bcc9090260401c5b6001603e1b821615611dd8576801306fe0a31b7152df0260401c5b6001603d1b821615611df3576801172b83c7d517adce0260401c5b6001603c1b821615611e0e5768010b5586cf9890f62a0260401c5b6001603b1b821615611e29576801059b0d31585743ae0260401c5b6001603a1b821615611e4457680102c9a3e778060ee70260401c5b600160391b821615611e5f5768010163da9fb33356d80260401c5b600160381b821615611e7a57680100b1afa5abcbed610260401c5b600160371b821615611e955768010058c86da1c09ea20260401c5b600160361b821615611eb0576801002c605e2e8cec500260401c5b600160351b821615611ecb57680100162f3904051fa10260401c5b600160341b821615611ee6576801000b175effdc76ba0260401c5b600160331b821615611f0157680100058ba01fb9f96d0260401c5b600160321b821615611f1c5768010002c5cc37da94920260401c5b600160311b821615611f37576801000162e525ee05470260401c5b600160301b821615611f525768010000b17255775c040260401c5b6001602f1b821615611f6d576801000058b91b5bc9ae0260401c5b6001602e1b821615611f8857680100002c5c89d5ec6d0260401c5b6001602d1b821615611fa35768010000162e43f4f8310260401c5b6001602c1b821615611fbe57680100000b1721bcfc9a0260401c5b6001602b1b821615611fd95768010000058b90cf1e6e0260401c5b6001602a1b821615611ff4576801000002c5c863b73f0260401c5b600160291b82161561200f57680100000162e430e5a20260401c5b600160281b82161561202a576801000000b1721835510260401c5b600160271b82161561204557680100000058b90c0b490260401c5b600160261b8216156120605768010000002c5c8601cc0260401c5b600160251b82161561207b576801000000162e42fff00260401c5b600160241b8216156120965768010000000b17217fbb0260401c5b600160231b8216156120b1576801000000058b90bfce0260401c5b600160221b8216156120cc57680100000002c5c85fe30260401c5b600160211b8216156120e75768010000000162e42ff10260401c5b600160201b82161561210257680100000000b17217f80260401c5b638000000082161561211d5768010000000058b90bfc0260401c5b6340000000821615612138576801000000002c5c85fe0260401c5b632000000082161561215357680100000000162e42ff0260401c5b631000000082161561216e576801000000000b17217f0260401c5b630800000082161561218957680100000000058b90c00260401c5b63040000008216156121a45768010000000002c5c8600260401c5b63020000008216156121bf576801000000000162e4300260401c5b63010000008216156121da5768010000000000b172180260401c5b628000008216156121f4576801000000000058b90c0260401c5b6240000082161561220e57680100000000002c5c860260401c5b622000008216156122285768010000000000162e430260401c5b6210000082161561224257680100000000000b17210260401c5b6208000082161561225c5768010000000000058b910260401c5b62040000821615612276576801000000000002c5c80260401c5b6202000082161561229057680100000000000162e40260401c5b620100008216156122a95761b172600160401b010260401c5b6180008216156122c1576158b9600160401b010260401c5b6140008216156122d957612c5d600160401b010260401c5b6120008216156122f15761162e600160401b010260401c5b61100082161561230957610b17600160401b010260401c5b6108008216156123215761058c600160401b010260401c5b610400821615612339576102c6600160401b010260401c5b61020082161561235157610163600160401b010260401c5b6101008216156123685760b1600160401b010260401c5b608082161561237e576059600160401b010260401c5b604082161561239457602c600160401b010260401c5b60208216156123aa576016600160401b010260401c5b60108216156123c057600b600160401b010260401c5b60088216156123d6576006600160401b010260401c5b60048216156123ec576003600160401b010260401c5b6002821615612402576001600160401b010260401c5b6001821615612418576001600160401b010260401c5b670de0b6b3a76400000260409190911c60bf031c90565b60405180606001604052806000815260200160008152602001600081525090565b604080516101a081018252600060e08201818152610100830182905261012083018290526101408301829052610160830182905261018083018290528252825160808101845281815260208082018390528185018390526060820192909252908201529081016124be6125c1565b8152600060208201526040016124d2612682565b815260006020820181905260409091015290565b6040518060c0016040528060008152602001600081526020016000815260200160006001600160a01b0316815260200160008152602001600081525090565b60405180610100016040528060006001600160a01b0316815260200161254961257f565b815260200161255661257f565b815260200160008152602001600081526020016000815260200160008152602001600081525090565b604051806040016040528060008152602001600081525090565b6040518060800160405280600081526020016000815260200160008152602001600081525090565b604080516101408101909152600060608083018281526080840183905260a0840183905260c0840183905260e0840183905261010084019290925261012083015281526020810161265f60408051610140810190915280600081526020016000815260200160008152602001600081526020016000815260200160008152602001600081526020016000815260200160008152602001600081525090565b815260408051606081018252600080825260208281018290529282015291015290565b6040805160c081019091526000606082018181526080830182905260a0830191909152819081526020016126fb6040518061012001604052806000815260200160008152602001600081526020016000815260200160008152602001600081526020016000815260200160008152602001600081525090565b81526040805160208181019092526000815291015290565b6001600160a01b038116811461272857600080fd5b50565b8035611cd281612713565b60006080828403121561274857600080fd5b604051608081016001600160401b038111828210171561277857634e487b7160e01b600052604160045260246000fd5b604052905080823561278981612713565b8152602083013561279981612713565b602082015260408301356127ac81612713565b604082015260608301356127bf81612713565b6060919091015292915050565b6000604082840312156127de57600080fd5b604080519081016001600160401b038111828210171561280e57634e487b7160e01b600052604160045260246000fd5b604052823581526020928301359281019290925250919050565b801515811461272857600080fd5b6000806000806000806000610160888a03121561285257600080fd5b873561285d81612713565b965061286c8960208a01612736565b955061287b8960a08a016127cc565b945060e08801359350610100880135925061012088013591506101408801356128a381612828565b8091505092959891949750929550565b6000806000806000806000610180888a0312156128cf57600080fd5b87356128da81612713565b96506128e98960208a01612736565b955060a08801356128f981612713565b945060c088013561290981612713565b935060e08801359250612920896101008a016127cc565b9150612930896101408a016127cc565b905092959891949750929550565b6000806000806000808688036101c081121561295957600080fd5b873561296481612713565b96506129738960208a01612736565b955060c0609f198201121561298757600080fd5b50604051606081016001600160401b03811182821017156129b857634e487b7160e01b600052604160045260246000fd5b6040526129c88960a08a016127cc565b81526129d78960e08a016127cc565b60208201526129ea896101208a016127cc565b60408201529350610160870135612a0081612713565b92506101808701359150612a176101a0880161272b565b90509295509295509295565b6001600160a01b03169052565b600081518084526020808501945080840160005b83811015612a695781516001600160a01b031687529582019590820190600101612a44565b509495945050505050565b634e487b7160e01b600052602160045260246000fd5b60088110612a9a57612a9a612a74565b9052565b60038110612a9a57612a9a612a74565b612ab9828251612a8a565b6020810151612acb6020840182612a9e565b5060408101516040830152606081015160608301526080810151608083015260a081015160a083015260c081015160c083015260e081015160e08301526101008082015181840152506101208082015181840152505050565b80516101c080845281516001600160a01b0390811691850191909152602082015181166101e08501526040820151166102008401526060810151600091612b6f610220860183612a23565b60808101519150612b84610240860183612a23565b60a08101519150612b99610260860183612a23565b60c0015160e06102808601529050612bb56102a0850182612a30565b90506020830151612bc96020860182612aae565b5060408381015180511515610160870152602081015115156101808701529081015115156101a0860152509392505050565b805160018060a01b03808251168452806020830151166020850152806040830151166040850152505060208101518051606084015260208101516080840152604081015160a0840152606081015160c0840152608081015160e084015260a0810151610100818186015260c083015161012086015260e08301516101408601528083015161016086015250505060408101516111ab6101808401825115159052565b60028110612a9a57612a9a612a74565b606081526000835160018060a01b038082511660608501528060208301511660808501528060408301511660a08501528060608301511660c08501528060808301511660e08501525060a08101519050612d0b610100840182612a23565b5060208481015180516001600160a01b039081166101208601529181015182166101408501526040810151821661016085015260608101519091166101808401525060408401516103606101a0840152612d696103c0840182612b24565b905060608501516101c08401526080850151612d896101e0850182612bfb565b5060a085015161038084015260c0850151612da86103a0850182612c9d565b5090506109a3602083018480518252602090810151910152565b60008060008060808587031215612dd857600080fd5b505082516020840151604085015160609095015191969095509092509050565b600080600060608486031215612e0d57600080fd5b8351925060208401519150604084015190509250925092565b634e487b7160e01b600052601160045260246000fd5b808202811582820484141761067b5761067b612e26565b6000600160ff1b8201612e6857612e68612e26565b5060000390565b6001600160a01b0392831681529116602082015260400190565b634e487b7160e01b600052601260045260246000fd5b600082612eae57612eae612e89565b500490565b8082018082111561067b5761067b612e26565b8181038181111561067b5761067b612e26565b600082612ee857612ee8612e89565b600160ff1b821460001984141615612f0257612f02612e26565b500590565b6001600160a01b0391909116815260200190565b600060208284031215612f2d57600080fd5b5051919050565b8181036000831280158383131683831282161715612f5457612f54612e26565b5092915050565b8082018281126000831280158216821582161715612f7b57612f7b612e26565b505092915050565b600060208284031215612f9557600080fd5b81516109a38161282856fea2646970667358221220ec65ae56e140d241169dd2aead5c5d97428159b04f6a9f525c1cb7973159288164736f6c63430008120033";

type ReaderPricingUtilsConstructorParams =
  | [linkLibraryAddresses: ReaderPricingUtilsLibraryAddresses, signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ReaderPricingUtilsConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => {
  return (
    typeof xs[0] === "string" ||
    (Array.isArray as (arg: any) => arg is readonly any[])(xs[0]) ||
    "_isInterface" in xs[0]
  );
};

export class ReaderPricingUtils__factory extends ContractFactory {
  constructor(...args: ReaderPricingUtilsConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      const [linkLibraryAddresses, signer] = args;
      super(
        _abi,
        ReaderPricingUtils__factory.linkBytecode(linkLibraryAddresses),
        signer
      );
    }
  }

  static linkBytecode(
    linkLibraryAddresses: ReaderPricingUtilsLibraryAddresses
  ): string {
    let linkedBytecode = _bytecode;

    linkedBytecode = linkedBytecode.replace(
      new RegExp("__\\$91a1a7f12f728c8759f4be979bae55555f\\$__", "g"),
      linkLibraryAddresses["contracts/position/PositionUtils.sol:PositionUtils"]
        .replace(/^0x/, "")
        .toLowerCase()
    );

    return linkedBytecode;
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ReaderPricingUtils> {
    return super.deploy(overrides || {}) as Promise<ReaderPricingUtils>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): ReaderPricingUtils {
    return super.attach(address) as ReaderPricingUtils;
  }
  override connect(signer: Signer): ReaderPricingUtils__factory {
    return super.connect(signer) as ReaderPricingUtils__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ReaderPricingUtilsInterface {
    return new utils.Interface(_abi) as ReaderPricingUtilsInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ReaderPricingUtils {
    return new Contract(address, _abi, signerOrProvider) as ReaderPricingUtils;
  }
}

export interface ReaderPricingUtilsLibraryAddresses {
  ["contracts/position/PositionUtils.sol:PositionUtils"]: string;
}